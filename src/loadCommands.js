"use strict";

const fs = require("node:fs");
const path = require("node:path");

function loadCommands({
  commandsPath = path.join(__dirname, "commands"),
  logger = console,
} = {}) {
  const commands = new Map();

  if (!fs.existsSync(commandsPath)) {
    throw new Error(`Commands directory not found at ${commandsPath}`);
  }

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"))
    .sort();

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (!command?.data?.name || typeof command.execute !== "function") {
      throw new Error(
        `${file} must export a command with data.name and an execute function.`,
      );
    }

    if (commands.has(command.data.name)) {
      throw new Error(`Duplicate slash command name: ${command.data.name}`);
    }

    commands.set(command.data.name, command);
    logger.log(`Loaded command: ${command.data.name}`);
  }

  return commands;
}

module.exports = loadCommands;
