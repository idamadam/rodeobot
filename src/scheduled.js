"use strict";

const cron = require('node-cron');
const sendBirthdayMessages = require("./components/processBirthdays");

function scheduledMessages() {
  // Send a birthday message at 9am
  cron.schedule('0 9 * * * *', () => {
    sendBirthdayMessages("Australia/Melbourne");
  }, {
    scheduled: true,
    timezone: "Australia/Melbourne"
  });
}

module.exports = scheduledMessages;

