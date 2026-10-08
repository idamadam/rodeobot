import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadNewsletterConfig,
  loadWorkerConfig,
  parseFriends,
  validateWebhookUrl,
} from "../config.js";

const USER_ID = "123456789012345678";
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/223456789012345678/example-token";

describe("Worker configuration", () => {
  it("normalizes canonical friend records", () => {
    assert.deepEqual(
      parseFriends(
        JSON.stringify([
          { discordUserId: ` ${USER_ID} `, birthday: " August 13 " },
        ]),
      ),
      [{ discordUserId: USER_ID, birthday: "August 13" }],
    );
  });

  it("rejects invalid friend containers and records", () => {
    assert.throws(() => parseFriends("not json"), /valid JSON/);
    assert.throws(() => parseFriends("{}"), /JSON array/);
    assert.throws(() => parseFriends("[null]"), /must be an object/);
    assert.throws(() => parseFriends("[{}]"), /discordUserId is required/);
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: "@alice", birthday: "August 13" }]),
        ),
      /Discord user ID/,
    );
  });

  it("requires canonical IDs and valid full birthday dates", () => {
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUsername: USER_ID, birthday: "August 13" }]),
        ),
      /discordUserId is required/,
    );
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: USER_ID, birthday: "Feb 29" }]),
        ),
      /full "Month Day"/,
    );
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: USER_ID, birthday: "April 31" }]),
        ),
      /not a valid date/,
    );
    assert.throws(
      () =>
        parseFriends(
          JSON.stringify([{ discordUserId: USER_ID, birthday: null }]),
        ),
      /full "Month Day"/,
    );
  });

  it("accepts Discord webhook URLs with current API paths", () => {
    assert.equal(validateWebhookUrl(WEBHOOK_URL), WEBHOOK_URL);
    assert.equal(
      validateWebhookUrl(
        "https://canary.discord.com/api/v10/webhooks/223456789012345678/token#ignored",
      ),
      "https://canary.discord.com/api/v10/webhooks/223456789012345678/token",
    );
  });

  it("rejects malformed, insecure, or unrelated webhook URLs", () => {
    assert.throws(() => validateWebhookUrl("not a URL"), /valid URL/);
    assert.throws(
      () => validateWebhookUrl(WEBHOOK_URL.replace("https:", "http:")),
      /Discord incoming webhook URL/,
    );
    assert.throws(
      () =>
        validateWebhookUrl(
          "https://example.com/api/webhooks/223456789012345678/token",
        ),
      /Discord incoming webhook URL/,
    );
    assert.throws(
      () => validateWebhookUrl("https://discord.com/api/webhooks/not-an-id/token"),
      /Discord incoming webhook URL/,
    );
  });

  it("loads both required Worker secrets", () => {
    const friendJson = JSON.stringify([
      { discordUserId: USER_ID, birthday: "February 29" },
    ]);

    assert.deepEqual(
      loadWorkerConfig({
        DISCORD_WEBHOOK_URL: ` ${WEBHOOK_URL} `,
        FRIENDS_JSON: friendJson,
      }),
      {
        webhookUrl: WEBHOOK_URL,
        friends: [{ discordUserId: USER_ID, birthday: "February 29" }],
      },
    );
    assert.throws(() => loadWorkerConfig({}), /DISCORD_WEBHOOK_URL secret/);
    assert.throws(
      () => loadWorkerConfig({ DISCORD_WEBHOOK_URL: WEBHOOK_URL }),
      /FRIENDS_JSON secret/,
    );
  });
  it("loads the separate newsletter webhook", () => {
    assert.deepEqual(loadNewsletterConfig({ LETTERLOOP_WEBHOOK_URL: ` ${WEBHOOK_URL} ` }), {
      webhookUrl: WEBHOOK_URL,
    });
    assert.throws(
      () => loadNewsletterConfig({ LETTERLOOP_WEBHOOK_URL: "nope" }),
      /LETTERLOOP_WEBHOOK_URL must be a valid URL/,
    );
  });
});
