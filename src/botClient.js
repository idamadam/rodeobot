"use strict";

const { Client, Events, GatewayIntentBits } = require("discord.js");

// Singleton cache
let clientInstance = null;
let readyPromise = null;

/**
 * Validates required environment variables for the Discord bot.
 * @throws {Error} if DISCORD_BOT_TOKEN is not set
 */
function validateToken(token) {
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set.");
  }
}

/**
 * Initializes the Discord client singleton.
 * Creates the client on first call and caches both the instance and ready promise.
 * Subsequent calls return the cached ready promise.
 *
 * @returns {Promise<Client>} Promise that resolves with the ready Discord client
 */
function initClient({
  token = process.env.DISCORD_BOT_TOKEN,
  ClientClass = Client,
} = {}) {
  // Return cached promise if already initialized
  if (readyPromise) {
    return readyPromise;
  }

  // Validate environment variables
  validateToken(token);

  // Create new client instance
  clientInstance = new ClientClass({
    intents: [GatewayIntentBits.Guilds],
  });

  // Set up event listeners
  clientInstance.on(Events.ClientReady, () => {
    console.log(`Bot is ready! Logged in as ${clientInstance.user.tag}`);
  });

  clientInstance.on(Events.Error, (error) => {
    console.error("Discord client error:", error);
  });

  // Create and cache the ready promise
  readyPromise = new Promise((resolve, reject) => {
    const handleReady = () => {
      clientInstance.removeListener(Events.Error, handleStartupError);
      resolve(clientInstance);
    };

    const handleStartupError = (error) => {
      clientInstance.removeListener(Events.ClientReady, handleReady);
      reject(error);
    };

    clientInstance.once(Events.ClientReady, handleReady);
    clientInstance.once(Events.Error, handleStartupError);

    clientInstance.login(token).catch(handleStartupError);
  });

  return readyPromise;
}

function destroyClient() {
  if (clientInstance) {
    clientInstance.destroy();
  }

  clientInstance = null;
  readyPromise = null;
}

module.exports = {
  destroyClient,
  initClient,
};
