"use strict";

require("dotenv").config();
const { Client, GatewayIntentBits } = require('discord.js');
const friends = require("./friends.json");
const BirthdayService = require("./src/birthdayService");

async function sendBirthdayMessages() {
  const birthdayService = new BirthdayService();
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