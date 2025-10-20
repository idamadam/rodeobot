"use strict";

const { EventEmitter } = require("events");

jest.mock("node-cron", () => {
  return {
    schedule: jest.fn(),
    validate: jest.fn(() => true)
  };
});

jest.mock("../reminders/sendBirthdayMessages", () => jest.fn().mockResolvedValue());

const cron = require("node-cron");
const sendBirthdayMessages = require("../reminders/sendBirthdayMessages");
const { startBirthdayScheduler } = require("../scheduler");

class MockClient extends EventEmitter {
  constructor({ ready = false } = {}) {
    super();
    this._ready = ready;
  }

  isReady() {
    return this._ready;
  }

  markReady() {
    this._ready = true;
    this.emit("ready");
  }
}

describe("startBirthdayScheduler", () => {
  let scheduledCallback;
  let mockTask;
  let consoleLogSpy;

  beforeEach(() => {
    scheduledCallback = undefined;
    mockTask = {
      start: jest.fn(),
      stop: jest.fn(),
      fireOnTick: jest.fn(),
      destroy: jest.fn()
    };

    cron.schedule.mockImplementation((expression, callback, options) => {
      scheduledCallback = callback;
      return mockTask;
    });

    cron.validate.mockReturnValue(true);
    sendBirthdayMessages.mockResolvedValue();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  test("waits for the ready event before scheduling and triggers reminders", async () => {
    const client = new MockClient();
    const birthdayService = { timezone: "UTC" };

    const schedulerPromise = startBirthdayScheduler({
      client,
      birthdayService,
      channelId: "channel-123",
      schedule: "*/1 * * * *"
    });

    // Ensure we have yielded to the scheduler before emitting ready
    await Promise.resolve();

    expect(cron.schedule).not.toHaveBeenCalled();

    client.markReady();

    const task = await schedulerPromise;

    expect(task).toBe(mockTask);
    expect(cron.schedule).toHaveBeenCalledWith(
      "*/1 * * * *",
      expect.any(Function),
      expect.objectContaining({ scheduled: true, timezone: "UTC" })
    );

    await scheduledCallback();

    expect(sendBirthdayMessages).toHaveBeenCalledWith({
      client,
      birthdayService,
      channelId: "channel-123"
    });
  });

  test("swallows errors from reminder execution and logs them", async () => {
    const client = new MockClient({ ready: true });
    const birthdayService = { timezone: "Australia/Melbourne" };
    sendBirthdayMessages.mockRejectedValueOnce(new Error("boom"));

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await startBirthdayScheduler({
      client,
      birthdayService,
      channelId: "channel-abc",
      schedule: "*/1 * * * *"
    });

    await expect(scheduledCallback()).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error in scheduled birthday reminder:",
      "boom"
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Stack trace:",
      expect.stringContaining("Error: boom")
    );

    consoleErrorSpy.mockRestore();
  });
});
