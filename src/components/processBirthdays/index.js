"use strict";

require("dotenv").config();

const friends = require("../../../friends.json");

const getMessages = require("./getMessages");
const sendOnReady = require("../sendOnReady");

function processBirthdays(timezone) {
  const channelId = process.env.GENERAL_CHANNEL_ID;
  
  const birthdayMessages = getMessages({ people: friends, timezone, messageType: "birthdays" });
  const reminderMessages = getMessages({ people: friends, timezone, messageType: "reminders" });

  const messages = [...birthdayMessages, ...reminderMessages]

  if (messages.length == 0) {
    console.log("No birthday messages to send today.");
    return;
  }

  sendOnReady({
    channelId,
    messages,
  });

  console.log(`Sent ${birthdayMessages.length} birthday messages & ${reminderMessages.length} birthday reminders.`);
}

module.exports = processBirthdays;
