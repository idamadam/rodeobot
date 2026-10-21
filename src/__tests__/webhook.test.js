import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildWebhookPayload,
  executeDiscordWebhook,
} from "../webhook.js";

const USER_1 = "123456789012345678";
const USER_2 = "223456789012345678";
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/323456789012345678/example-token";

describe("Discord webhook delivery", () => {
  it("combines message blocks and restricts user mentions", () => {
    assert.deepEqual(
      buildWebhookPayload([
        { content: `Hello <@${USER_1}>`, discordUserId: USER_1 },
        { content: `Again <@${USER_1}>`, discordUserId: USER_1 },
        { content: `Hello <@${USER_2}>`, discordUserId: USER_2 },
      ]),
      {
        username: "RodeoBot",
        content: `Hello <@${USER_1}>\n\nAgain <@${USER_1}>\n\nHello <@${USER_2}>`,
        allowed_mentions: { parse: [], users: [USER_1, USER_2] },
      },
    );
  });

  it("rejects empty and oversized payloads", () => {
    assert.throws(() => buildWebhookPayload([]), /At least one/);
    assert.throws(
      () =>
        buildWebhookPayload([
          { content: "x".repeat(2_001), discordUserId: USER_1 },
        ]),
      /Discord allows 2000/,
    );

    const tooManyMentions = Array.from({ length: 101 }, (_, index) => ({
      content: "x",
      discordUserId: String(100000000000000000n + BigInt(index)),
    }));
    assert.throws(
      () => buildWebhookPayload(tooManyMentions),
      /Discord allows 100/,
    );
  });

  it("posts JSON and requests a confirmed Discord response", async () => {
    const calls = [];
    const payload = buildWebhookPayload([
      { content: "Happy birthday!", discordUserId: USER_1 },
    ]);

    await executeDiscordWebhook(
      `${WEBHOOK_URL}?thread_id=42`,
      payload,
      async (...args) => {
        calls.push(args);
        return { ok: true, status: 200 };
      },
    );

    const [url, options] = calls[0];
    assert.equal(url, `${WEBHOOK_URL}?thread_id=42&wait=true`);
    assert.deepEqual(options, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it("reports sanitized network and HTTP failures", async () => {
    await assert.rejects(
      executeDiscordWebhook(WEBHOOK_URL, {}, async () => {
        throw new Error(`failed to fetch ${WEBHOOK_URL}`);
      }),
      { message: "Discord webhook request could not be completed." },
    );
    await assert.rejects(
      executeDiscordWebhook(WEBHOOK_URL, {}, async () => ({
        ok: false,
        status: 429,
      })),
      { message: "Discord webhook request failed with status 429." },
    );
    await assert.rejects(
      executeDiscordWebhook(WEBHOOK_URL, {}, async () => undefined),
      { message: "Discord webhook request failed with status unknown." },
    );
  });
});
