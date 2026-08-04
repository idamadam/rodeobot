"use strict";

const { REST, Routes } = require("discord.js");
const { loadDeploymentConfig } = require("./config");
const loadCommands = require("./loadCommands");

/**
 * Deploys slash commands to Discord
 * This script registers all commands in the commands directory with Discord's API
 */
async function deployCommands() {
  const { token, clientId, guildId } = loadDeploymentConfig();
  const commands = [...loadCommands().values()].map((command) =>
    command.data.toJSON(),
  );

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(token);

  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    // Register commands to a specific guild (faster for development)
    // For production, you might want to register globally instead
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
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
      console.log("Command deployment complete!");
    })
    .catch((error) => {
      console.error("Failed to deploy commands:", error);
      process.exitCode = 1;
    });
}

module.exports = { deployCommands };
