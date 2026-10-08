import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it, mock } from "node:test";

import { deliverNewsletterEmail } from "../newsletterService.js";
import worker from "../worker.js";

const ISSUE_EMAIL = readFileSync(new URL("./fixtures/letterloop-issue.eml", import.meta.url));
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/323456789012345678/example-token";
const ENV = { LETTERLOOP_WEBHOOK_URL: WEBHOOK_URL };

function discordFetch(calls, { failAt } = {}) {
  return async (url, init) => {
    calls.push({ url: new URL(url), body: JSON.parse(init.body) });
    if (calls.length === failAt) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => ({ id: "1", channel_id: "777" }) };
  };
}

function emailMessage(raw, rawSize = raw.length) {
  return { raw: new Response(raw).body, rawSize };
}

describe("newsletter email delivery", () => {
  afterEach(() => mock.restoreAll());

  it("creates a forum post and replies in its thread", async () => {
    const calls = [];
    const logs = [];
    const result = await deliverNewsletterEmail({
      raw: ISSUE_EMAIL,
      env: ENV,
      fetchImpl: discordFetch(calls),
      logger: { log: (message) => logs.push(message) },
    });

    assert.deepEqual(result, { status: "sent", messageCount: 9 });
    assert.equal(calls[0].url.searchParams.get("thread_id"), null);
    assert.equal(calls[0].body.thread_name, "Issue No.3 · November 13th, 2026");
    assert.ok(calls.slice(1).every((call) => call.url.searchParams.get("thread_id") === "777"));
    assert.deepEqual(logs, ["Posted The Test Loop issue 3 as 9 Discord message(s)."]);
  });

  it("ignores mail that is not a Letterloop issue before loading secrets", async () => {
    const calls = [];
    const logs = [];
    const raw = [
      "From: Gmail Team <forwarding-noreply@google.com>",
      "Subject: Gmail Forwarding Confirmation",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Confirmation code: 123456789",
    ].join("\r\n");

    const result = await deliverNewsletterEmail({
      raw,
      env: {},
      fetchImpl: discordFetch(calls),
      logger: { log: (message) => logs.push(message) },
    });

    assert.deepEqual(result, { status: "ignored", messageCount: 0 });
    assert.equal(calls.length, 0);
    assert.deepEqual(logs, [
      "Ignored email from Gmail Team <forwarding-noreply@google.com>: Gmail Forwarding Confirmation",
      "Gmail forwarding confirmation code: 123456789",
    ]);

    await deliverNewsletterEmail({
      raw: "From: forwarding-noreply@google.com\nContent-Type: text/html\n\n<p>Confirmation code: <b>4242</b></p>",
      env: {},
      logger: { log: (message) => logs.push(message) },
    });
    assert.equal(logs.at(-1), "Gmail forwarding confirmation code: 4242");

    await deliverNewsletterEmail({
      raw: "From: forwarding-noreply@google.com\n\nClick   this\nlink",
      env: {},
      logger: { log: (message) => logs.push(message) },
    });
    assert.equal(logs.at(-1), "Gmail forwarding confirmation body: Click this link");

    await deliverNewsletterEmail({
      raw: "From: hello@letterloop.co\nSubject: 💬 New comment on The Pig Pen\n\nHi",
      env: {},
      logger: { log: (message) => logs.push(message) },
    });
    assert.match(logs.at(-1), /New comment/);

    await deliverNewsletterEmail({ raw: "", env: {}, logger: { log: (message) => logs.push(message) } });
    assert.equal(logs.at(-1), "Ignored email from unknown sender: ");
  });

  it("requires the newsletter webhook secret", async () => {
    await assert.rejects(
      deliverNewsletterEmail({ raw: ISSUE_EMAIL, env: {}, logger: { log() {} } }),
      { message: "LETTERLOOP_WEBHOOK_URL secret is not set." },
    );
    await assert.rejects(
      deliverNewsletterEmail({
        raw: ISSUE_EMAIL,
        env: { LETTERLOOP_WEBHOOK_URL: "https://example.com/hook" },
        logger: { log() {} },
      }),
      { message: "LETTERLOOP_WEBHOOK_URL must be a Discord incoming webhook URL." },
    );
  });

  it("reports how many messages were sent before a failure", async () => {
    const calls = [];
    await assert.rejects(
      deliverNewsletterEmail({
        raw: ISSUE_EMAIL,
        env: ENV,
        fetchImpl: discordFetch(calls, { failAt: 3 }),
        logger: { log() {} },
      }),
      (error) => error.sentCount === 2 && /status 500/.test(error.message),
    );
  });

  it("fails when the webhook does not point at a forum channel", async () => {
    await assert.rejects(
      deliverNewsletterEmail({
        raw: ISSUE_EMAIL,
        env: ENV,
        fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }),
        logger: { log() {} },
      }),
      (error) => error.sentCount === 1 && /forum post ID/.test(error.message),
    );
  });
});

describe("email Worker handler", () => {
  afterEach(() => mock.restoreAll());

  it("delivers raw message streams", async () => {
    const calls = [];
    mock.method(globalThis, "fetch", discordFetch(calls));
    mock.method(console, "log", () => {});

    const result = await worker.email(emailMessage(ISSUE_EMAIL), ENV);
    assert.deepEqual(result, { status: "sent", messageCount: 9 });
    assert.equal(calls.length, 9);
  });

  it("ignores oversized messages without reading them", async () => {
    const errors = [];
    mock.method(console, "error", (...args) => errors.push(args.join(" ")));
    const result = await worker.email({ rawSize: 6 * 1024 * 1024 }, ENV);
    assert.deepEqual(result, { status: "ignored", messageCount: 0 });
    assert.match(errors[0], /6291456-byte email/);
  });

  it("rethrows failures only when nothing was posted", async () => {
    const errors = [];
    mock.method(console, "error", (...args) => errors.push(args.join(" ")));
    mock.method(console, "log", () => {});

    await assert.rejects(worker.email(emailMessage(ISSUE_EMAIL), {}), /secret is not set/);

    const calls = [];
    mock.method(globalThis, "fetch", discordFetch(calls, { failAt: 2 }));
    const result = await worker.email(emailMessage(ISSUE_EMAIL), ENV);
    assert.deepEqual(result, { status: "partial", messageCount: 1 });
    assert.deepEqual(errors, [
      "Newsletter delivery failed: LETTERLOOP_WEBHOOK_URL secret is not set.",
      "Newsletter delivery failed: Discord webhook request failed with status 500.",
    ]);
    assert.ok(errors.every((message) => !message.includes("example-token")));
  });
});
