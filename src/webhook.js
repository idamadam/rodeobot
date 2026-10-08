export const DISCORD_MESSAGE_LIMIT = 2_000;
export const DISCORD_MENTION_LIMIT = 100;

export function buildWebhookPayload(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("At least one birthday message is required.");
  }

  const content = messages.map((message) => message.content).join("\n\n");
  if (content.length > DISCORD_MESSAGE_LIMIT) {
    throw new Error(
      `Birthday message is ${content.length} characters; Discord allows ${DISCORD_MESSAGE_LIMIT}.`,
    );
  }

  const users = [...new Set(messages.map((message) => message.discordUserId))];
  if (users.length > DISCORD_MENTION_LIMIT) {
    throw new Error(
      `Birthday message mentions ${users.length} users; Discord allows ${DISCORD_MENTION_LIMIT}.`,
    );
  }

  return {
    username: "RodeoBot",
    content,
    allowed_mentions: {
      parse: [],
      users,
    },
  };
}

// Long issues post dozens of messages, which can exhaust Discord's
// per-channel webhook budget for up to a minute.
const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_RATE_LIMIT_WAIT_MS = 90_000;

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readJson(response) {
  try {
    return typeof response?.json === "function" ? await response.json() : null;
  } catch {
    return null;
  }
}

function headerValue(response, name) {
  return typeof response?.headers?.get === "function" ? response.headers.get(name) : null;
}

function retryDelayMs(response, body) {
  const seconds = Number(body?.retry_after ?? headerValue(response, "retry-after"));
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : 1_000;
}

// Returns Discord's message object (from `wait=true`) when the response has one.
export async function executeDiscordWebhook(
  webhookUrl,
  payload,
  fetchImpl = fetch,
  { threadId, sleep = defaultSleep } = {},
) {
  const endpoint = new URL(webhookUrl);
  endpoint.searchParams.set("wait", "true");
  if (threadId) endpoint.searchParams.set("thread_id", threadId);
  // Non-application webhooks may send display-only components when opted in.
  if (payload?.components) endpoint.searchParams.set("with_components", "true");

  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(endpoint.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error("Discord webhook request could not be completed.");
    }

    if (response?.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const delay = retryDelayMs(response, await readJson(response));
      if (delay <= MAX_RATE_LIMIT_WAIT_MS) {
        await sleep(delay);
        continue;
      }
    }

    if (!response?.ok) {
      const status = Number.isInteger(response?.status) ? response.status : "unknown";
      throw new Error(`Discord webhook request failed with status ${status}.`);
    }

    // Pace bursts of messages by honouring an exhausted rate-limit bucket.
    if (headerValue(response, "x-ratelimit-remaining") === "0") {
      const resetAfter = Number(headerValue(response, "x-ratelimit-reset-after"));
      if (Number.isFinite(resetAfter) && resetAfter > 0) {
        await sleep(Math.min(Math.ceil(resetAfter * 1000), MAX_RATE_LIMIT_WAIT_MS));
      }
    }

    return readJson(response);
  }
}
