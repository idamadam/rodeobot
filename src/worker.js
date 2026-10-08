import {
  TIMEZONE,
  createBirthdayMessages,
  getZonedDateParts,
} from "./birthdayService.js";
import { loadWorkerConfig } from "./config.js";
import {
  MAX_EMAIL_BYTES,
  deliverNewsletterEmail,
  readEmailBytes,
} from "./newsletterService.js";
import { buildWebhookPayload, executeDiscordWebhook } from "./webhook.js";

const DELIVERY_HOUR = 8;

export async function runScheduledBirthdayCheck({
  scheduledTime,
  env,
  fetchImpl = fetch,
  logger = console,
}) {
  const localTime = getZonedDateParts(scheduledTime, TIMEZONE);

  // Both UTC triggers run daily; exactly one corresponds to 08:00 Melbourne
  // as the city moves between UTC+10 and UTC+11.
  if (localTime.hour !== DELIVERY_HOUR) {
    logger.log(
      `Birthday check skipped outside ${String(DELIVERY_HOUR).padStart(2, "0")}:00 ${TIMEZONE}.`,
    );
    return { status: "skipped", messageCount: 0 };
  }

  const { friends, webhookUrl } = loadWorkerConfig(env);
  const messages = createBirthdayMessages(friends, scheduledTime);

  if (messages.length === 0) {
    logger.log("Birthday check complete; no messages due today.");
    return { status: "empty", messageCount: 0 };
  }

  const payload = buildWebhookPayload(messages);
  await executeDiscordWebhook(webhookUrl, payload, fetchImpl);
  logger.log(`Birthday check complete; sent ${messages.length} message block(s).`);

  return { status: "sent", messageCount: messages.length };
}

export default {
  async scheduled(controller, env) {
    try {
      const result = await runScheduledBirthdayCheck({
        scheduledTime: controller.scheduledTime,
        env,
      });
      controller.noRetry();
      return result;
    } catch (error) {
      console.error("Scheduled birthday check failed:", error.message);
      throw error;
    }
  },

  async email(message, env) {
    if (message.rawSize > MAX_EMAIL_BYTES) {
      console.error(`Ignored ${message.rawSize}-byte email; the limit is ${MAX_EMAIL_BYTES}.`);
      return { status: "ignored", messageCount: 0 };
    }

    try {
      return await deliverNewsletterEmail({ raw: await readEmailBytes(message), env });
    } catch (error) {
      console.error("Newsletter delivery failed:", error.message);
      // Once a forum post exists, a redelivery would create a duplicate post.
      if (error.sentCount) return { status: "partial", messageCount: error.sentCount };
      throw error;
    }
  },
};
