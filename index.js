"use strict";

require("dotenv").config();
const { initClient, getReadyClient } = require('./src/botClient');
const BirthdayService = require("./src/birthdayService");
const { startBirthdayScheduler } = require('./src/scheduler');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // Initialize the Discord client (starts login process)
    initClient();

    // Get the ready client
    const client = await getReadyClient();

    // Auto-deploy slash commands on startup (if CLIENT_ID and GUILD_ID are set)
    if (process.env.CLIENT_ID && process.env.GUILD_ID) {
      try {
        const { deployCommands } = require('./src/deploy-commands');
        await deployCommands();
        console.log('Slash commands deployed successfully');
      } catch (error) {
        console.warn('Failed to deploy commands (continuing anyway):', error.message);
        // Don't exit - bot can still run without slash commands
      }
    } else {
      console.log('Skipping command deployment (CLIENT_ID or GUILD_ID not set)');
    }

    // Load slash commands
    const commands = new Map();
    const commandsPath = path.join(__dirname, 'src', 'commands');

    if (fs.existsSync(commandsPath)) {
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
          console.log(`Loaded command: ${command.data.name}`);
        }
      }
    }

    // Handle slash command interactions
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorMessage = 'There was an error executing this command!';
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        } else if (interaction.deferred) {
          await interaction.editReply(errorMessage);
        }
      }
    });

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
