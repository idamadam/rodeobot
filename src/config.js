import { parseBirthday } from "./birthdayService.js";

const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const DISCORD_WEBHOOK_HOST_PATTERN = /^(?:(?:canary|ptb)\.)?discord\.com$/;

function requiredSecret(name, env) {
  const value = env?.[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} secret is not set.`);
  }

  return value.trim();
}

function validateDiscordId(value, fieldName) {
  if (!DISCORD_ID_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a Discord user ID containing 17 to 20 digits.`);
  }

  return value;
}

export function parseFriends(value) {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("FRIENDS_JSON must contain valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("FRIENDS_JSON must contain a JSON array.");
  }

  return parsed.map((friend, index) => {
    if (!friend || typeof friend !== "object" || Array.isArray(friend)) {
      throw new Error(`FRIENDS_JSON[${index}] must be an object.`);
    }

    if (typeof friend.discordUserId !== "string") {
      throw new Error(`FRIENDS_JSON[${index}].discordUserId is required.`);
    }

    const discordUserId = validateDiscordId(
      friend.discordUserId.trim(),
      `FRIENDS_JSON[${index}].discordUserId`,
    );
    const birthday =
      typeof friend.birthday === "string" ? friend.birthday.trim() : friend.birthday;

    try {
      parseBirthday(birthday);
    } catch (error) {
      throw new Error(`FRIENDS_JSON[${index}].birthday ${error.message}`);
    }

    return { discordUserId, birthday };
  });
}

export function validateWebhookUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("DISCORD_WEBHOOK_URL must be a valid URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const versionOffset = /^v\d+$/.test(segments[1] ?? "") ? 1 : 0;
  const webhookId = segments[2 + versionOffset];
  const webhookToken = segments[3 + versionOffset];
  const hasValidPath =
    segments[0] === "api" &&
    segments[1 + versionOffset] === "webhooks" &&
    segments.length === 4 + versionOffset &&
    DISCORD_ID_PATTERN.test(webhookId ?? "") &&
    Boolean(webhookToken);

  if (
    url.protocol !== "https:" ||
    !DISCORD_WEBHOOK_HOST_PATTERN.test(url.hostname) ||
    !hasValidPath
  ) {
    throw new Error("DISCORD_WEBHOOK_URL must be a Discord incoming webhook URL.");
  }

  url.hash = "";
  return url.toString();
}

export function loadWorkerConfig(env) {
  return {
    webhookUrl: validateWebhookUrl(requiredSecret("DISCORD_WEBHOOK_URL", env)),
    friends: parseFriends(requiredSecret("FRIENDS_JSON", env)),
  };
}
