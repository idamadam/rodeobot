import { loadNewsletterConfig } from "./config.js";
import {
  LETTERLOOP_SENDER,
  parseIssueSubject,
  parseLetterloopIssue,
} from "./letterloop.js";
import { extractEmailAddress, parseRawEmail } from "./mime.js";
import { buildNewsletterMessages } from "./newsletterMessages.js";
import { executeDiscordWebhook } from "./webhook.js";

export const MAX_EMAIL_BYTES = 5 * 1024 * 1024;
const GMAIL_FORWARDING_SENDER = "forwarding-noreply@google.com";
const CONFIRMATION_CODE_PATTERN = /confirmation code\D{0,20}?(\d{4,})/i;

// Gmail puts the forwarding confirmation code only in the message body. If
// its wording changes, the body itself is logged so setup is never blocked.
function gmailConfirmationLog(email) {
  if (extractEmailAddress(email.from) !== GMAIL_FORWARDING_SENDER) return null;
  const body = (email.text || email.html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const code = CONFIRMATION_CODE_PATTERN.exec(body)?.[1];
  return code
    ? `Gmail forwarding confirmation code: ${code}`
    : `Gmail forwarding confirmation body: ${body.slice(0, 1_500)}`;
}

export async function readEmailBytes(message) {
  return new Uint8Array(await new Response(message.raw).arrayBuffer());
}

export async function deliverNewsletterEmail({
  raw,
  env,
  fetchImpl = fetch,
  logger = console,
  sleep,
}) {
  const email = parseRawEmail(raw);
  const subjectInfo = parseIssueSubject(email.subject);

  if (extractEmailAddress(email.from) !== LETTERLOOP_SENDER || !subjectInfo) {
    logger.log(`Ignored email from ${email.from || "unknown sender"}: ${email.subject}`);
    const confirmation = gmailConfirmationLog(email);
    if (confirmation) logger.log(confirmation);
    return { status: "ignored", messageCount: 0 };
  }

  const { webhookUrl } = loadNewsletterConfig(env);
  const issue = parseLetterloopIssue(email.html);
  const messages = buildNewsletterMessages(issue, subjectInfo);

  let threadId;
  let sent = 0;
  try {
    for (const payload of messages) {
      const response = await executeDiscordWebhook(webhookUrl, payload, fetchImpl, {
        threadId,
        sleep,
      });
      sent += 1;
      threadId ??= response?.channel_id;
      if (!threadId) throw new Error("Discord did not return the new forum post ID.");
    }
  } catch (error) {
    error.sentCount = sent;
    throw error;
  }

  logger.log(
    `Posted ${issue.title} ${subjectInfo.issueNumber ? `issue ${subjectInfo.issueNumber} ` : ""}as ${sent} Discord message(s).`,
  );
  return { status: "sent", messageCount: sent };
}
