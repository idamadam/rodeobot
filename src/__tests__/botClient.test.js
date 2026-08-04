"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { afterEach, beforeEach, describe, it, mock } = require("node:test");
const { Events, GatewayIntentBits } = require("discord.js");
const { destroyClient, initClient } = require("../botClient");

class FakeClient extends EventEmitter {
  static instances = [];

  constructor(options) {
    super();
    this.destroyed = false;
    this.loginCalls = [];
    this.options = options;
    this.user = { tag: "RodeoBot#1234" };
    FakeClient.instances.push(this);
  }

  login(token) {
    this.loginCalls.push(token);
    queueMicrotask(() => this.emit(Events.ClientReady, this));
    return Promise.resolve(token);
  }

  destroy() {
    this.destroyed = true;
  }
}

describe("botClient", () => {
  beforeEach(() => {
    destroyClient();
    FakeClient.instances = [];
    mock.method(console, "log", () => {});
  });

  afterEach(() => {
    destroyClient();
    mock.restoreAll();
  });

  it("logs in once and reuses the ready client", async () => {
    const first = initClient({ token: "token", ClientClass: FakeClient });
    const second = initClient({ token: "token", ClientClass: FakeClient });

    assert.equal(first, second);
    const client = await first;
    assert.equal(await second, client);
    assert.equal(FakeClient.instances.length, 1);
    assert.deepEqual(client.loginCalls, ["token"]);
    assert.deepEqual(client.options.intents, [GatewayIntentBits.Guilds]);
  });

  it("destroys and clears the cached client", async () => {
    const firstClient = await initClient({
      token: "token",
      ClientClass: FakeClient,
    });

    destroyClient();
    assert.equal(firstClient.destroyed, true);

    const secondClient = await initClient({
      token: "token",
      ClientClass: FakeClient,
    });
    assert.notEqual(firstClient, secondClient);
  });

  it("rejects missing tokens before constructing a client", () => {
    assert.throws(
      () => initClient({ token: "", ClientClass: FakeClient }),
      /DISCORD_BOT_TOKEN environment variable is not set/,
    );
    assert.equal(FakeClient.instances.length, 0);
  });

  it("rejects startup client errors and logs them", async () => {
    const errors = [];
    mock.restoreAll();
    mock.method(console, "log", () => {});
    mock.method(console, "error", (...args) => errors.push(args));

    class FailingClient extends FakeClient {
      login(token) {
        this.loginCalls.push(token);
        queueMicrotask(() => this.emit(Events.Error, new Error("login failed")));
        return Promise.resolve(token);
      }
    }

    await assert.rejects(
      initClient({ token: "token", ClientClass: FailingClient }),
      /login failed/,
    );
    assert.equal(errors[0][0], "Discord client error:");
    assert.match(errors[0][1].message, /login failed/);
  });
});
