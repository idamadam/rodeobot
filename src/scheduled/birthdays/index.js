"use strict";

require("dotenv").config();

const friends = require("../../../friends.json");

const { getBirthdayWishes, getReminders } = require("./getMessages");

function buildBirthdayMessages(timezone) {
  const birthdayWishes = getBirthdayWishes({ people: friends, timezone });
  const reminders = getReminders({ people: friends, timezone });

  const messages = [...reminders, ...birthdayWishes];

  if (messages.length == 0) {
    console.log("No birthday messages to send today.");
    return;
  }

  console.log(`Sent ${birthdayWishes.length/2} birthday messages & ${reminders.length} birthday reminders.`);
  return messages;
}

module.exports = buildBirthdayMessages;
