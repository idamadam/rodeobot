"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { afterEach, beforeEach, describe, it, mock } = require("node:test");
const { Events } = require("discord.js");
const { startBirthdayScheduler } = require("../scheduler");

class MockClient extends EventEmitter {
  constructor({ ready = false } = {}) {
    super();
    this.ready = ready;
  }

  isReady() {
    return this.ready;
  }

  markReady() {
    this.ready = true;
    this.emit(Events.ClientReady);
  }
}

describe("startBirthdayScheduler", () => {
  let scheduledCallback;
  let scheduleCall;
  let cronScheduler;
  let task;

  beforeEach(() => {
    scheduledCallback = undefined;
    scheduleCall = undefined;
    task = { stop() {} };
    cronScheduler = {
      validate: () => true,
      schedule(expression, callback, options) {
        scheduleCall = { expression, options };
        scheduledCallback = callback;
        return task;
      },
    };
    mock.method(console, "log", () => {});
  });

  afterEach(() => mock.restoreAll());

  it("waits for clientReady before scheduling and triggers reminders", async () => {
    const client = new MockClient();
    const birthdayService = { timezone: "UTC" };
    const calls = [];
    const sendMessages = async (params) => calls.push(params);

    const schedulerPromise = startBirthdayScheduler({
      client,
      birthdayService,
      channelId: "channel-123",
      schedule: "*/1 * * * *",
      cronScheduler,
      sendMessages,
    });

    await Promise.resolve();
    assert.equal(scheduleCall, undefined);

    client.markReady();
    assert.equal(await schedulerPromise, task);
    assert.deepEqual(scheduleCall, {
      expression: "*/1 * * * *",
      options: {
        name: "birthday-reminders",
        noOverlap: true,
        timezone: "UTC",
      },
    });

    await scheduledCallback();
    assert.deepEqual(calls, [
      { client, birthdayService, channelId: "channel-123" },
    ]);
  });

  it("logs reminder errors without rejecting the scheduled callback", async () => {
    const errorCalls = [];
    mock.method(console, "error", (...args) => errorCalls.push(args));

    await startBirthdayScheduler({
      client: new MockClient({ ready: true }),
      birthdayService: { timezone: "Australia/Melbourne" },
      channelId: "channel-abc",
      schedule: "*/1 * * * *",
      cronScheduler,
      sendMessages: async () => {
        throw new Error("boom");
      },
    });

    await scheduledCallback();
    assert.equal(errorCalls[0][0], "Error in scheduled birthday reminder:");
    assert.equal(errorCalls[0][1], "boom");
    assert.match(errorCalls[1][1], /Error: boom/);
  });

  it("rejects invalid cron expressions before scheduling", async () => {
    cronScheduler.validate = () => false;

    await assert.rejects(
      startBirthdayScheduler({
        client: new MockClient({ ready: true }),
        birthdayService: { timezone: "UTC" },
        channelId: "channel-abc",
        schedule: "not a cron",
        cronScheduler,
      }),
      /Invalid birthday cron schedule/,
    );
    assert.equal(scheduleCall, undefined);
  });

  it("uses the documented 08:00 default schedule", async () => {
    const originalSchedule = process.env.BIRTHDAY_CRON_SCHEDULE;
    delete process.env.BIRTHDAY_CRON_SCHEDULE;

    try {
      await startBirthdayScheduler({
        client: new MockClient({ ready: true }),
        birthdayService: { timezone: "UTC" },
        channelId: "channel-abc",
        cronScheduler,
      });
      assert.equal(scheduleCall.expression, "0 8 * * *");
    } finally {
      if (originalSchedule === undefined) {
        delete process.env.BIRTHDAY_CRON_SCHEDULE;
      } else {
        process.env.BIRTHDAY_CRON_SCHEDULE = originalSchedule;
      }
    }
  });

  it("creates and destroys a task with the installed node-cron implementation", async () => {
    const realTask = await startBirthdayScheduler({
      client: new MockClient({ ready: true }),
      birthdayService: { timezone: "UTC" },
      channelId: "channel-abc",
      schedule: "0 0 1 1 *",
      sendMessages: async () => {},
    });

    assert.equal(realTask.getStatus(), "idle");
    await realTask.destroy();
    assert.equal(realTask.getStatus(), "destroyed");
  });
});
