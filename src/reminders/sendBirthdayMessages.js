"use strict";

const { loadFriends } = require("../config");

/**
 * Sends birthday messages using the provided Discord client
 * @param {Object} params
 * @param {Client} params.client - Discord.js client instance (must be ready)
 * @param {BirthdayService} params.birthdayService - Birthday service instance
 * @param {string} params.channelId - Discord channel ID to send messages to
 */
async function sendBirthdayMessages({ client, birthdayService, channelId }) {
  // Load friends with error handling
  let friends;
  try {
    friends = loadFriends(process.env, birthdayService.timezone);
    console.log(`Loaded ${friends.length} friend(s) from FRIENDS_JSON`);
  } catch (error) {
    console.error("Failed to load friend data:", error.message);
    return;
  }

  // Get birthday messages
  const messages = birthdayService.getBirthdayMessages(friends);

  if (messages.length === 0) {
    console.log("No birthday messages to send today.");
    return;
  }

  console.log(`Found ${messages.length} message(s) to send`);

  // Fetch channel with error handling
  let channel;
  try {
    channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error(`Channel ${channelId} not found`);
      return;
    }

    if (!channel.isSendable()) {
      console.error(`Channel ${channelId} does not support sending messages.`);
      return;
    }
  } catch (error) {
    console.error("Failed to fetch channel:", error.message);
    return;
  }

  let sentCount = 0;

  for (const [index, message] of messages.entries()) {
    try {
      await channel.send(message);
      sentCount += 1;
    } catch (error) {
      console.error(
        `Failed to send birthday message ${index + 1}/${messages.length}:`,
        error.message,
      );
    }
  }

  console.log(
    `Successfully sent ${sentCount}/${messages.length} message(s) to channel ${channelId}`,
  );
}

module.exports = sendBirthdayMessages;
