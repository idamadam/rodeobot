"use strict";

require("dotenv").config();
const { Client, GatewayIntentBits } = require('discord.js');
const BirthdayService = require("./src/birthdayService");

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

async function sendBirthdayMessages() {
  const birthdayService = new BirthdayService();
  const friends = loadFriends();
  const messages = birthdayService.getBirthdayMessages(friends);

  if (messages.length === 0) {
    console.log('No messages to send today.');
    return;
  }

  // Send messages
  try {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
    const channel = client.channels.cache.get(process.env.GENERAL_CHANNEL_ID);
    
    for (const message of messages) {
      await channel.send(message);
    }

    console.log('Messages sent successfully');
    client.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendBirthdayMessages();
