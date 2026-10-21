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

export async function executeDiscordWebhook(
  webhookUrl,
  payload,
  fetchImpl = fetch,
) {
  const endpoint = new URL(webhookUrl);
  endpoint.searchParams.set("wait", "true");

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

  if (!response?.ok) {
    const status = Number.isInteger(response?.status) ? response.status : "unknown";
    throw new Error(`Discord webhook request failed with status ${status}.`);
  }
}
