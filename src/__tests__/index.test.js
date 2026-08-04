"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { describe, it } = require("node:test");
const { MessageFlags } = require("discord.js");
const { replyWithCommandError, run } = require("../../index");

describe("command error replies", () => {
  it("sends an ephemeral initial reply", async () => {
    const replies = [];
    await replyWithCommandError({
      deferred: false,
      replied: false,
      async reply(response) {
        replies.push(response);
      },
    });

    assert.deepEqual(replies, [
      {
        content: "There was an error executing this command!",
        flags: MessageFlags.Ephemeral,
      },
    ]);
  });

  it("edits an existing deferred reply", async () => {
    const edits = [];
    await replyWithCommandError({
      deferred: true,
      replied: false,
      async editReply(response) {
        edits.push(response);
      },
    });

    assert.deepEqual(edits, [
      { content: "There was an error executing this command!" },
    ]);
  });

  it("follows up after an earlier reply", async () => {
    const followUps = [];
    await replyWithCommandError({
      deferred: false,
      replied: true,
      async followUp(response) {
        followUps.push(response);
      },
    });

    assert.equal(followUps[0].flags, MessageFlags.Ephemeral);
  });
});

describe("application startup", () => {
  it("wires the client, commands, scheduler, and graceful shutdown", async () => {
    const processRef = new EventEmitter();
    processRef.env = { TEST_ENV: "true" };
    const client = new EventEmitter();
    const scheduler = {
      destroyed: false,
      async destroy() {
        this.destroyed = true;
      },
    };
    const birthdayService = { timezone: "Australia/Melbourne" };
    const commandCalls = [];
    const configCalls = [];
    const connectCalls = [];
    const schedulerCalls = [];
    const logs = [];
    const errors = [];
    let disconnectCount = 0;

    const result = await run({
      createBirthdayService: () => birthdayService,
      loadConfig: (env, timezone) => {
        configCalls.push({ env, timezone });
        return { token: "token", channelId: "channel" };
      },
      commandLoader: () =>
        new Map([
          [
            "test",
            { execute: async (interaction) => commandCalls.push(interaction) },
          ],
          [
            "failing",
            {
              execute: async () => {
                throw new Error("command failed");
              },
            },
          ],
        ]),
      connectClient: async (options) => {
        connectCalls.push(options);
        return client;
      },
      startScheduler: async (options) => {
        schedulerCalls.push(options);
        return scheduler;
      },
      disconnectClient: () => {
        disconnectCount += 1;
      },
      processRef,
      logger: {
        log: (message) => logs.push(message),
        error: (...args) => errors.push(args),
      },
    });

    assert.equal(result.client, client);
    assert.deepEqual(configCalls, [
      { env: processRef.env, timezone: "Australia/Melbourne" },
    ]);
    assert.deepEqual(connectCalls, [{ token: "token" }]);
    assert.deepEqual(schedulerCalls, [
      { client, birthdayService, channelId: "channel" },
    ]);

    const interaction = {
      commandName: "test",
      isChatInputCommand: () => true,
    };
    await client.listeners("interactionCreate")[0](interaction);
    assert.deepEqual(commandCalls, [interaction]);

    const interactionHandler = client.listeners("interactionCreate")[0];
    await interactionHandler({ isChatInputCommand: () => false });
    await interactionHandler({
      commandName: "missing",
      isChatInputCommand: () => true,
    });

    const errorReplies = [];
    await interactionHandler({
      commandName: "failing",
      deferred: false,
      replied: false,
      isChatInputCommand: () => true,
      async reply(response) {
        errorReplies.push(response);
      },
    });
    assert.equal(errorReplies[0].flags, MessageFlags.Ephemeral);
    assert.match(errors[0][0], /No command matching missing/);
    assert.match(errors[1][0], /Error executing failing/);

    processRef.emit("SIGTERM");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(scheduler.destroyed, true);
    assert.equal(disconnectCount, 1);
    assert.ok(logs.includes("Received SIGTERM; shutting down RodeoBot..."));

    processRef.emit("SIGINT");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(disconnectCount, 1);
  });
});
