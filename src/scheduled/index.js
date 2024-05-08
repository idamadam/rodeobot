"use strict";

require("dotenv").config();

const buildBirthdayMessages = require("./birthdays");
const friends = require("../../friends.json");

async function sendBirthdayMessages (client) {
  const channel = client.channels.cache.get(process.env.GENERAL_CHANNEL_ID);
  let messages = buildBirthdayMessages(friends, "Australia/Melbourne");

  if (messages.length > 0) {
    messages.forEach((message) => {
      channel.send(message)
    })
  }
}

module.exports = sendBirthdayMessages;

