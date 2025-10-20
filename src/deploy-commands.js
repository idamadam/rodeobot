"use strict";

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Deploys slash commands to Discord
 * This script registers all commands in the commands directory with Discord's API
 */
async function deployCommands() {
  // Validate required environment variables
  if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is not set in environment variables');
  }
  if (!process.env.CLIENT_ID) {
    throw new Error('CLIENT_ID is not set in environment variables');
  }
  if (!process.env.GUILD_ID) {
    throw new Error('GUILD_ID is not set in environment variables');
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');

  // Check if commands directory exists
  if (!fs.existsSync(commandsPath)) {
    console.error(`Commands directory not found at ${commandsPath}`);
    return;
  }

  // Load all command files
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Warning: ${file} is missing required "data" or "execute" property`);
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Register commands to a specific guild (faster for development)
    // For production, you might want to register globally instead
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  deployCommands()
    .then(() => {
      console.log('Command deployment complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to deploy commands:', error);
      process.exit(1);
    });
}

module.exports = { deployCommands };
