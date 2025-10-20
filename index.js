"use strict";

require("dotenv").config();
const { initClient, getReadyClient } = require('./src/botClient');
const BirthdayService = require("./src/birthdayService");
const { startBirthdayScheduler } = require('./src/scheduler');

async function run() {
  try {
    // Initialize the Discord client (starts login process)
    initClient();

    // Get the ready client
    const client = await getReadyClient();

    // Create birthday service instance
    const birthdayService = new BirthdayService();

    // Get channel ID from environment
    const channelId = process.env.GENERAL_CHANNEL_ID;

    // Start the scheduler (keeps process alive)
    await startBirthdayScheduler({
      client,
      birthdayService,
      channelId
    });

    console.log('RodeoBot is running. Press Ctrl+C to exit.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
