"use strict";

require("dotenv").config();

const { getBirthdayWishes, getReminders } = require("./getMessages");

function buildBirthdayMessages(data, timezone) {
  const birthdayWishes = getBirthdayWishes({ people: data, timezone });
  const reminders = getReminders({ people: data, timezone });

  const messages = [...reminders, ...birthdayWishes];

  if (messages.length == 0) {
    console.log("No birthday messages to send today.");
    return messages;
  }

  console.log(`Built ${birthdayWishes.length/2} birthday messages & ${reminders.length} birthday reminders.`);
  return messages;
}

module.exports = buildBirthdayMessages;
