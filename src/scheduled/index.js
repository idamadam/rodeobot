"use strict";

require("dotenv").config();

const cron = require('node-cron');
const buildBirthdayMessages = require("./birthdays");
const friends = require("../../friends.json");

function scheduledMessages(client) {
  // Send a birthday message at 9am
  cron.schedule('0 9 * * * *', () => {
    let messages = buildBirthdayMessages(friends, "Australia/Melbourne");
    const channel = client.channels.cache.get(process.env.GENERAL_CHANNEL_ID);
    messages.forEach((message) => {
      channel.send(message)
    })
  }, {
    scheduled: true,
    timezone: "Australia/Melbourne"
  });
}

module.exports = scheduledMessages;

