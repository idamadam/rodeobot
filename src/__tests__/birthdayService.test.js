import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BIRTHDAY_GIF_URL,
  addCalendarDays,
  createBirthdayMessages,
  getZonedDateParts,
  parseBirthday,
} from "../birthdayService.js";

const USER_1 = "123456789012345678";
const USER_2 = "223456789012345678";
const USER_3 = "323456789012345678";

describe("birthday service", () => {
  const friends = [
    { discordUserId: USER_1, birthday: "April 15" },
    { discordUserId: USER_2, birthday: "April 29" },
    { discordUserId: USER_3, birthday: "May 15" },
  ];

  it("generates today's birthday and reminder blocks in Melbourne time", () => {
    const messages = createBirthdayMessages(
      friends,
      Date.parse("2024-04-14T22:00:00Z"),
    );

    assert.deepEqual(messages, [
      {
        content: `Happy birthday to <@${USER_1}>!!! :partying_face: :confetti_ball: :beers:\n${BIRTHDAY_GIF_URL}`,
        discordUserId: USER_1,
      },
      {
        content: `It's <@${USER_2}>'s birthday in 14 days - Monday the 29th of Apr. What's the plan?`,
        discordUserId: USER_2,
      },
    ]);
  });

  it("handles empty and non-matching friend lists", () => {
    const scheduledTime = Date.parse("2024-04-14T22:00:00Z");

    assert.deepEqual(createBirthdayMessages([], scheduledTime), []);
    assert.deepEqual(
      createBirthdayMessages([friends[2]], scheduledTime),
      [],
    );
  });

  it("handles reminder windows crossing into a new year", () => {
    const messages = createBirthdayMessages(
      [{ discordUserId: USER_1, birthday: "January 3" }],
      Date.parse("2024-12-19T21:00:00Z"),
    );

    assert.equal(
      messages[0].content,
      `It's <@${USER_1}>'s birthday in 14 days - Friday the 3rd of Jan. What's the plan?`,
    );
  });

  it("supports February 29 birthdays only when that date occurs", () => {
    const friend = { discordUserId: USER_1, birthday: "February 29" };

    assert.equal(
      createBirthdayMessages(
        [friend],
        Date.parse("2024-02-28T21:00:00Z"),
      ).length,
      1,
    );
    assert.deepEqual(
      createBirthdayMessages(
        [friend],
        Date.parse("2023-02-27T21:00:00Z"),
      ),
      [],
    );
  });

  it("uses calendar arithmetic for month and leap-year boundaries", () => {
    assert.deepEqual(
      addCalendarDays({ year: 2024, month: 2, day: 28 }, 1),
      { year: 2024, month: 2, day: 29 },
    );
    assert.deepEqual(
      addCalendarDays({ year: 2024, month: 12, day: 31 }, 1),
      { year: 2025, month: 1, day: 1 },
    );
  });

  it("identifies 08:00 Melbourne in both daylight-saving offsets", () => {
    assert.deepEqual(
      getZonedDateParts(Date.parse("2024-01-01T21:00:00Z")),
      { year: 2024, month: 1, day: 2, hour: 8 },
    );
    assert.deepEqual(
      getZonedDateParts(Date.parse("2024-06-01T22:00:00Z")),
      { year: 2024, month: 6, day: 2, hour: 8 },
    );
  });

  it("supports custom reminder intervals and ordinal suffixes", () => {
    const base = Date.parse("2024-05-31T22:00:00Z");
    const birthdays = [
      { discordUserId: USER_1, birthday: "June 1" },
      { discordUserId: USER_2, birthday: "June 2" },
      { discordUserId: USER_3, birthday: "June 11" },
    ];

    const reminderContent = (reminderDays) =>
      createBirthdayMessages(birthdays, base, { reminderDays }).find(
        ({ content }) => content.includes("birthday in"),
      ).content;

    assert.match(reminderContent(0), /1st of Jun/);
    assert.match(reminderContent(1), /2nd of Jun/);
    assert.match(reminderContent(10), /11th of Jun/);
  });

  it("rejects malformed dates and timestamps", () => {
    assert.throws(() => parseBirthday("Feb 29"), /full "Month Day"/);
    assert.throws(() => parseBirthday("April 31"), /not a valid date/);
    assert.throws(() => parseBirthday(null), /full "Month Day"/);
    assert.throws(() => getZonedDateParts("not-a-date"), /valid date/);
  });
});
