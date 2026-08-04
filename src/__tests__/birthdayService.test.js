"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const spacetime = require("spacetime");
const BirthdayService = require("../birthdayService");

const TIMEZONE = "Australia/Melbourne";
const USER_1 = "123456789012345678";
const USER_2 = "223456789012345678";
const USER_3 = "323456789012345678";

function createService(now, reminderDays = 14) {
  return new BirthdayService(
    TIMEZONE,
    reminderDays,
    () => spacetime(now, TIMEZONE),
  );
}

describe("BirthdayService", () => {
  const friends = [
    { discordUserId: USER_1, birthday: "April 15" },
    { discordUserId: USER_2, birthday: "April 29" },
    { discordUserId: USER_3, birthday: "May 15" },
  ];

  it("generates birthday messages for today", () => {
    const messages = createService("2024-04-15").getBirthdayMessages(friends);

    assert.ok(
      messages.includes(
        `Happy birthday to <@${USER_1}>!!! :partying_face: :confetti_ball: :beers:`,
      ),
    );
    assert.ok(
      messages.includes(
        "https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif",
      ),
    );
  });

  it("generates reminders for upcoming birthdays", () => {
    const messages = createService("2024-04-15").getBirthdayMessages(friends);

    assert.ok(
      messages.includes(
        `It's <@${USER_2}>'s birthday in 14 days - Monday the 29th of Apr. What's the plan?`,
      ),
    );
  });

  it("does not generate messages for non-matching dates", () => {
    const messages = createService("2024-04-15").getBirthdayMessages(friends);

    assert.equal(messages.some((message) => message.includes(USER_3)), false);
  });

  it("handles an empty friends list", () => {
    assert.deepEqual(createService("2024-04-15").getBirthdayMessages([]), []);
  });

  it("handles reminder windows that cross into a new year", () => {
    const messages = createService("2024-12-20").getBirthdayMessages([
      { discordUserId: USER_1, birthday: "January 3" },
    ]);

    assert.ok(
      messages.includes(
        `It's <@${USER_1}>'s birthday in 14 days - Friday the 3rd of Jan. What's the plan?`,
      ),
    );
  });

  it("supports February 29 birthdays in leap years", () => {
    const messages = createService("2024-02-29").getBirthdayMessages([
      { discordUserId: USER_1, birthday: "February 29" },
    ]);

    assert.ok(messages[0].includes(USER_1));
  });
});
