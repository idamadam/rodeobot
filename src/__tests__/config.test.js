"use strict";

const assert = require("node:assert/strict");
const { afterEach, describe, it, mock } = require("node:test");
const {
  loadBotConfig,
  loadDeploymentConfig,
  parseFriends,
} = require("../config");

const USER_ID = "123456789012345678";
const CHANNEL_ID = "223456789012345678";

describe("configuration", () => {
  afterEach(() => mock.restoreAll());

  it("normalizes valid friend records", () => {
    assert.deepEqual(
      parseFriends(
        JSON.stringify([{ discordUserId: USER_ID, birthday: "August 13" }]),
      ),
      [{ discordUserId: USER_ID, birthday: "August 13" }],
    );
  });

  it("supports the legacy discordUsername field when it contains an ID", () => {
    mock.method(console, "warn", () => {});

    assert.deepEqual(
      parseFriends(
        JSON.stringify([{ discordUsername: USER_ID, birthday: "August 13" }]),
      ),
      [{ discordUserId: USER_ID, birthday: "August 13" }],
    );
  });

  it("rejects usernames because Discord mentions require numeric IDs", () => {
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([
            { discordUserId: "@alice", birthday: "August 13" },
          ]),
        ),
      /must be a Discord user or channel ID/,
    );
  });

  it("rejects non-array friend data and invalid birthdays", () => {
    assert.throws(() => parseFriends("{}"), /must contain a JSON array/);
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: USER_ID, birthday: "Feb 31" }]),
        ),
      /full "Month Day" format/,
    );
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: USER_ID, birthday: "April 31" }]),
        ),
      /not a valid date/,
    );
  });

  it("loads and validates startup configuration", () => {
    const env = {
      DISCORD_BOT_TOKEN: "token",
      GENERAL_CHANNEL_ID: CHANNEL_ID,
      FRIENDS_JSON: JSON.stringify([
        { discordUserId: USER_ID, birthday: "February 29" },
      ]),
    };

    assert.deepEqual(loadBotConfig(env), {
      token: "token",
      channelId: CHANNEL_ID,
    });
  });

  it("loads command deployment configuration independently", () => {
    assert.deepEqual(
      loadDeploymentConfig({
        DISCORD_BOT_TOKEN: "token",
        CLIENT_ID: USER_ID,
        GUILD_ID: CHANNEL_ID,
      }),
      { token: "token", clientId: USER_ID, guildId: CHANNEL_ID },
    );
  });
});
