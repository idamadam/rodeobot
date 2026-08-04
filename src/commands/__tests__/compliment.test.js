"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const compliment = require("../compliment");

describe("compliment command", () => {
  it("has deployable slash-command metadata", () => {
    assert.equal(compliment.data.name, "compliment");
    assert.equal(
      compliment.data.description,
      "Receive an absolutely unhinged compliment",
    );
  });

  it("mentions only the user who invoked it", async () => {
    const replies = [];
    const user = { id: "123456789012345678" };

    await compliment.execute({
      user,
      async reply(response) {
        replies.push(response);
      },
    });

    assert.equal(replies.length, 1);
    assert.match(replies[0].content, new RegExp(`^<@${user.id}> `));
    assert.match(replies[0].content, / 👁️👄👁️$/);
    assert.deepEqual(replies[0].allowedMentions, { users: [user.id] });
  });
});
