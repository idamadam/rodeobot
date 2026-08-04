"use strict";

const spacetime = require("spacetime");

const DISCORD_ID_PATTERN = /^\d{17,20}$/;
const BIRTHDAY_PATTERN =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) ([1-9]|[12]\d|3[01])$/;

let hasWarnedAboutLegacyUserField = false;

function requiredEnv(name, env = process.env) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is not set.`);
  }

  return value;
}

function validateDiscordId(value, fieldName) {
  if (!DISCORD_ID_PATTERN.test(value)) {
    throw new Error(
      `${fieldName} must be a Discord user or channel ID containing 17 to 20 digits.`,
    );
  }

  return value;
}

function validateBirthday(value, index, timezone) {
  if (typeof value !== "string" || !BIRTHDAY_PATTERN.test(value)) {
    throw new Error(
      `FRIENDS_JSON[${index}].birthday must use the full \"Month Day\" format, for example \"August 13\".`,
    );
  }

  // Use a leap year so February 29 remains a valid recurring birthday.
  if (!spacetime(`${value} 2000`, timezone).isValid()) {
    throw new Error(`FRIENDS_JSON[${index}].birthday is not a valid date.`);
  }

  return value;
}

function normalizeFriend(person, index, timezone) {
  if (!person || typeof person !== "object" || Array.isArray(person)) {
    throw new Error(`FRIENDS_JSON[${index}] must be an object.`);
  }

  const usesLegacyField = !person.discordUserId && person.discordUsername;
  const discordUserId = person.discordUserId || person.discordUsername;

  if (typeof discordUserId !== "string") {
    throw new Error(`FRIENDS_JSON[${index}].discordUserId is required.`);
  }

  if (usesLegacyField && !hasWarnedAboutLegacyUserField) {
    console.warn(
      "FRIENDS_JSON uses the deprecated discordUsername field; rename it to discordUserId.",
    );
    hasWarnedAboutLegacyUserField = true;
  }

  return {
    discordUserId: validateDiscordId(
      discordUserId.trim(),
      `FRIENDS_JSON[${index}].discordUserId`,
    ),
    birthday: validateBirthday(person.birthday, index, timezone),
  };
}

function parseFriends(value, timezone = "Australia/Melbourne") {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`Failed to parse FRIENDS_JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("FRIENDS_JSON must contain a JSON array.");
  }

  return parsed.map((person, index) => normalizeFriend(person, index, timezone));
}

function loadFriends(env = process.env, timezone = "Australia/Melbourne") {
  return parseFriends(requiredEnv("FRIENDS_JSON", env), timezone);
}

function loadBotConfig(env = process.env, timezone = "Australia/Melbourne") {
  const token = requiredEnv("DISCORD_BOT_TOKEN", env);
  const channelId = validateDiscordId(
    requiredEnv("GENERAL_CHANNEL_ID", env),
    "GENERAL_CHANNEL_ID",
  );

  // Validate friend configuration before connecting to Discord. The reminder
  // workflow reloads it for every scheduled run.
  loadFriends(env, timezone);

  return { token, channelId };
}

function loadDeploymentConfig(env = process.env) {
  return {
    token: requiredEnv("DISCORD_BOT_TOKEN", env),
    clientId: validateDiscordId(requiredEnv("CLIENT_ID", env), "CLIENT_ID"),
    guildId: validateDiscordId(requiredEnv("GUILD_ID", env), "GUILD_ID"),
  };
}

module.exports = {
  loadBotConfig,
  loadDeploymentConfig,
  loadFriends,
  parseFriends,
};
