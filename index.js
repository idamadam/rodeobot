"use strict";

const { Events, MessageFlags } = require("discord.js");
const { destroyClient, initClient } = require("./src/botClient");
const BirthdayService = require("./src/birthdayService");
const { loadBotConfig } = require("./src/config");
const loadCommands = require("./src/loadCommands");
const { startBirthdayScheduler } = require("./src/scheduler");

async function replyWithCommandError(interaction) {
  const response = {
    content: "There was an error executing this command!",
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.deferred) {
    await interaction.editReply({ content: response.content });
  } else if (interaction.replied) {
    await interaction.followUp(response);
  } else {
    await interaction.reply(response);
  }
}

async function run({
  createBirthdayService = () => new BirthdayService(),
  loadConfig = loadBotConfig,
  commandLoader = loadCommands,
  connectClient = initClient,
  startScheduler = startBirthdayScheduler,
  disconnectClient = destroyClient,
  processRef = process,
  logger = console,
} = {}) {
  const birthdayService = createBirthdayService();
  const { token, channelId } = loadConfig(
    processRef.env,
    birthdayService.timezone,
  );
  const commands = commandLoader();
  const client = await connectClient({ token });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}:`, error);

      try {
        await replyWithCommandError(interaction);
      } catch (replyError) {
        logger.error("Failed to send the command error response:", replyError);
      }
    }
  });

  const scheduler = await startScheduler({
    client,
    birthdayService,
    channelId,
  });

  let isShuttingDown = false;
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.log(`Received ${signal}; shutting down RodeoBot...`);
    try {
      await scheduler.destroy();
    } finally {
      disconnectClient();
    }
  };

  const handleSignal = (signal) => {
    shutdown(signal).catch((error) => {
      logger.error("Failed to shut down cleanly:", error);
      processRef.exitCode = 1;
    });
  };

  processRef.once("SIGINT", () => handleSignal("SIGINT"));
  processRef.once("SIGTERM", () => handleSignal("SIGTERM"));

  logger.log("RodeoBot is running. Press Ctrl+C to exit.");

  return { client, scheduler, shutdown };
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Failed to start RodeoBot:", error);
    destroyClient();
    process.exitCode = 1;
  });
}

module.exports = { replyWithCommandError, run };
