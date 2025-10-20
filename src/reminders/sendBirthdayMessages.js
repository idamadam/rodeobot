"use strict";

/**
 * Loads friend data from FRIENDS_JSON environment variable
 * @returns {Array} Array of friend objects
 * @throws {Error} If FRIENDS_JSON is not set or invalid
 */
function loadFriends() {
  const friendsEnv = process.env.FRIENDS_JSON;

  if (!friendsEnv) {
    throw new Error('FRIENDS_JSON environment variable is not set.');
  }

  try {
    return JSON.parse(friendsEnv);
  } catch (error) {
    throw new Error(`Failed to parse FRIENDS_JSON: ${error.message}`);
  }
}

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
    friends = loadFriends();
    console.log(`Loaded ${friends.length} friend(s) from FRIENDS_JSON`);
  } catch (error) {
    console.error('Failed to load friend data:', error.message);
    return; // Skip this run
  }

  // Get birthday messages
  const messages = birthdayService.getBirthdayMessages(friends);

  if (messages.length === 0) {
    console.log('No birthday messages to send today.');
    return;
  }

  console.log(`Found ${messages.length} message(s) to send`);

  // Fetch channel with error handling
  let channel;
  try {
    channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error(`Channel ${channelId} not found`);
      return; // Skip this run
    }

    // Validate channel is text-based
    if (!channel.isTextBased()) {
      console.error(`Channel ${channelId} is not text-based (type: ${channel.type})`);
      return; // Skip this run
    }
  } catch (error) {
    console.error('Failed to fetch channel:', error.message);
    return; // Skip this run
  }

  // Send messages
  try {
    for (const message of messages) {
      await channel.send(message);
    }
    console.log(`Successfully sent ${messages.length} message(s) to channel ${channelId}`);
  } catch (error) {
    console.error('Error sending messages:', error.message);
  }
}

module.exports = sendBirthdayMessages;
