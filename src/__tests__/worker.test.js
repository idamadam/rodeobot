import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import worker, { runScheduledBirthdayCheck } from "../worker.js";

const USER_1 = "123456789012345678";
const USER_2 = "223456789012345678";
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/323456789012345678/example-token";

function createLogger() {
  const logs = [];
  return {
    logs,
    logger: { log: (message) => logs.push(message) },
  };
}

describe("scheduled Worker", () => {
  afterEach(() => mock.restoreAll());

  it("sends one combined webhook request at 08:00 during AEST", async () => {
    const calls = [];
    const { logger, logs } = createLogger();
    const result = await runScheduledBirthdayCheck({
      scheduledTime: Date.parse("2024-04-14T22:00:00Z"),
      env: {
        DISCORD_WEBHOOK_URL: WEBHOOK_URL,
        FRIENDS_JSON: JSON.stringify([
          { discordUserId: USER_1, birthday: "April 15" },
          { discordUserId: USER_2, birthday: "April 29" },
        ]),
      },
      fetchImpl: async (...args) => {
        calls.push(args);
        return { ok: true, status: 200 };
      },
      logger,
    });

    assert.deepEqual(result, { status: "sent", messageCount: 2 });
    assert.equal(calls.length, 1);
    const payload = JSON.parse(calls[0][1].body);
    assert.deepEqual(payload.allowed_mentions, {
      parse: [],
      users: [USER_1, USER_2],
    });
    assert.match(payload.content, /Happy birthday/);
    assert.match(payload.content, /birthday in 14 days/);
    assert.deepEqual(logs, [
      "Birthday check complete; sent 2 message block(s).",
    ]);
  });

  it("also sends at 08:00 during AEDT", async () => {
    let fetchCount = 0;
    const result = await runScheduledBirthdayCheck({
      scheduledTime: Date.parse("2024-01-14T21:00:00Z"),
      env: {
        DISCORD_WEBHOOK_URL: WEBHOOK_URL,
        FRIENDS_JSON: JSON.stringify([
          { discordUserId: USER_1, birthday: "January 15" },
        ]),
      },
      fetchImpl: async () => {
        fetchCount += 1;
        return { ok: true, status: 200 };
      },
      logger: { log() {} },
    });

    assert.equal(result.status, "sent");
    assert.equal(fetchCount, 1);
  });

  it("skips the second UTC trigger before loading secrets", async () => {
    let fetchCount = 0;
    const { logger, logs } = createLogger();
    const result = await runScheduledBirthdayCheck({
      scheduledTime: Date.parse("2024-04-14T21:00:00Z"),
      env: {},
      fetchImpl: async () => {
        fetchCount += 1;
      },
      logger,
    });

    assert.deepEqual(result, { status: "skipped", messageCount: 0 });
    assert.equal(fetchCount, 0);
    assert.match(logs[0], /skipped outside 08:00 Australia\/Melbourne/);
  });

  it("does not call Discord when no message is due", async () => {
    let fetchCount = 0;
    const { logger, logs } = createLogger();
    const result = await runScheduledBirthdayCheck({
      scheduledTime: Date.parse("2024-04-14T22:00:00Z"),
      env: {
        DISCORD_WEBHOOK_URL: WEBHOOK_URL,
        FRIENDS_JSON: JSON.stringify([
          { discordUserId: USER_1, birthday: "June 1" },
        ]),
      },
      fetchImpl: async () => {
        fetchCount += 1;
      },
      logger,
    });

    assert.deepEqual(result, { status: "empty", messageCount: 0 });
    assert.equal(fetchCount, 0);
    assert.deepEqual(logs, ["Birthday check complete; no messages due today."]);
  });

  it("marks successful scheduled invocations as non-retryable", async () => {
    let noRetryCount = 0;
    mock.method(console, "log", () => {});

    const result = await worker.scheduled(
      {
        scheduledTime: Date.parse("2024-04-14T21:00:00Z"),
        noRetry() {
          noRetryCount += 1;
        },
      },
      {},
    );

    assert.equal(result.status, "skipped");
    assert.equal(noRetryCount, 1);
  });

  it("rethrows failures without disabling retries", async () => {
    let noRetryCount = 0;
    const errors = [];
    mock.method(console, "error", (...args) => errors.push(args));

    await assert.rejects(
      worker.scheduled(
        {
          scheduledTime: Date.parse("2024-04-14T22:00:00Z"),
          noRetry() {
            noRetryCount += 1;
          },
        },
        {},
      ),
      /DISCORD_WEBHOOK_URL secret is not set/,
    );

    assert.equal(noRetryCount, 0);
    assert.deepEqual(errors, [
      [
        "Scheduled birthday check failed:",
        "DISCORD_WEBHOOK_URL secret is not set.",
      ],
    ]);
  });
});
