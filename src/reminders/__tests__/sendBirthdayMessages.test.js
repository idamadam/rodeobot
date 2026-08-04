"use strict";

const assert = require("node:assert/strict");
const { afterEach, beforeEach, describe, it, mock } = require("node:test");
const sendBirthdayMessages = require("../sendBirthdayMessages");

const USER_1 = "123456789012345678";
const USER_2 = "223456789012345678";

describe("sendBirthdayMessages", () => {
  let birthdayCalls;
  let birthdayMessages;
  let channel;
  let client;
  let errorCalls;
  let originalFriendsJson;
  let sentMessages;

  beforeEach(() => {
    originalFriendsJson = process.env.FRIENDS_JSON;
    process.env.FRIENDS_JSON = JSON.stringify([
      { discordUserId: USER_1, birthday: "April 15" },
    ]);

    birthdayCalls = [];
    birthdayMessages = [];
    sentMessages = [];
    errorCalls = [];

    channel = {
      isSendable: () => true,
      async send(message) {
        sentMessages.push(message);
      },
    };
    client = {
      channels: {
        async fetch() {
          return channel;
        },
      },
    };

    mock.method(console, "log", () => {});
    mock.method(console, "error", (...args) => errorCalls.push(args));
  });

  afterEach(() => {
    if (originalFriendsJson === undefined) {
      delete process.env.FRIENDS_JSON;
    } else {
      process.env.FRIENDS_JSON = originalFriendsJson;
    }
    mock.restoreAll();
  });

  function birthdayService() {
    return {
      timezone: "Australia/Melbourne",
      getBirthdayMessages(friends) {
        birthdayCalls.push(friends);
        return birthdayMessages;
      },
    };
  }

  it("loads friends and sends every birthday message", async () => {
    birthdayMessages = ["Happy birthday!", "https://giphy.com/example.gif"];

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.deepEqual(birthdayCalls, [
      [{ discordUserId: USER_1, birthday: "April 15" }],
    ]);
    assert.deepEqual(sentMessages, birthdayMessages);
  });

  it("does not fetch a channel when there are no messages", async () => {
    let fetchCount = 0;
    client.channels.fetch = async () => {
      fetchCount += 1;
      return channel;
    };

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.equal(fetchCount, 0);
    assert.deepEqual(sentMessages, []);
  });

  it("handles missing friend configuration", async () => {
    delete process.env.FRIENDS_JSON;

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.equal(errorCalls[0][0], "Failed to load friend data:");
    assert.match(errorCalls[0][1], /FRIENDS_JSON environment variable is not set/);
    assert.deepEqual(birthdayCalls, []);
  });

  it("handles invalid friend JSON", async () => {
    process.env.FRIENDS_JSON = "invalid json {";

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.match(errorCalls[0][1], /Failed to parse FRIENDS_JSON/);
    assert.deepEqual(birthdayCalls, []);
  });

  it("handles channel fetch failures", async () => {
    birthdayMessages = ["Happy birthday!"];
    client.channels.fetch = async () => {
      throw new Error("Unknown Channel");
    };

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.deepEqual(errorCalls[0], ["Failed to fetch channel:", "Unknown Channel"]);
    assert.deepEqual(sentMessages, []);
  });

  it("handles missing channels", async () => {
    birthdayMessages = ["Happy birthday!"];
    client.channels.fetch = async () => null;

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.deepEqual(errorCalls[0], ["Channel channel123 not found"]);
  });

  it("rejects channels that cannot send messages", async () => {
    birthdayMessages = ["Happy birthday!"];
    channel.isSendable = () => false;

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.deepEqual(errorCalls[0], [
      "Channel channel123 does not support sending messages.",
    ]);
    assert.deepEqual(sentMessages, []);
  });

  it("continues after an individual message fails", async () => {
    birthdayMessages = ["first", "second"];
    channel.send = async (message) => {
      if (message === "first") throw new Error("Missing Permissions");
      sentMessages.push(message);
    };

    await sendBirthdayMessages({
      client,
      birthdayService: birthdayService(),
      channelId: "channel123",
    });

    assert.deepEqual(sentMessages, ["second"]);
    assert.deepEqual(errorCalls[0], [
      "Failed to send birthday message 1/2:",
      "Missing Permissions",
    ]);
  });

  it("reloads and normalizes friend data on each invocation", async () => {
    const service = birthdayService();

    await sendBirthdayMessages({ client, birthdayService: service, channelId: "channel123" });
    process.env.FRIENDS_JSON = JSON.stringify([
      { discordUserId: USER_2, birthday: "May 20" },
    ]);
    await sendBirthdayMessages({ client, birthdayService: service, channelId: "channel123" });

    assert.deepEqual(birthdayCalls, [
      [{ discordUserId: USER_1, birthday: "April 15" }],
      [{ discordUserId: USER_2, birthday: "May 20" }],
    ]);
  });
});
