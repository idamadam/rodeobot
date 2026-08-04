"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const loadCommands = require("../loadCommands");

describe("loadCommands", () => {
  it("loads command modules into a name-keyed map", () => {
    const logs = [];
    const commands = loadCommands({
      logger: { log: (message) => logs.push(message) },
    });

    assert.deepEqual([...commands.keys()], ["compliment"]);
    assert.equal(typeof commands.get("compliment").execute, "function");
    assert.deepEqual(logs, ["Loaded command: compliment"]);
  });

  it("rejects a missing commands directory", () => {
    assert.throws(
      () => loadCommands({ commandsPath: "/tmp/rodeobot-missing-commands" }),
      /Commands directory not found/,
    );
  });
});
