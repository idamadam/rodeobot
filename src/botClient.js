"use strict";

const { Client, GatewayIntentBits } = require('discord.js');

// Singleton cache
let clientInstance = null;
let readyPromise = null;

/**
 * Validates required environment variables for the Discord bot.
 * @throws {Error} if DISCORD_BOT_TOKEN is not set
 */
function validateEnvVars() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN environment variable is not set.');
  }
}

/**
 * Initializes the Discord client singleton.
 * Creates the client on first call and caches both the instance and ready promise.
 * Subsequent calls return the cached ready promise.
 *
 * @returns {Promise<Client>} Promise that resolves with the ready Discord client
 */
function initClient() {
  // Return cached promise if already initialized
  if (readyPromise) {
    return readyPromise;
  }

  // Validate environment variables
  validateEnvVars();

  // Create new client instance
  clientInstance = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  // Set up event listeners
  clientInstance.on('ready', () => {
    console.log(`Bot is ready! Logged in as ${clientInstance.user.tag}`);
  });

  clientInstance.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  // Create and cache the ready promise
  readyPromise = new Promise((resolve, reject) => {
    // Resolve when client is ready
    clientInstance.once('ready', () => {
      resolve(clientInstance);
    });

    // Reject on login error
    clientInstance.on('error', (error) => {
      reject(error);
    });

    // Attempt login
    clientInstance.login(process.env.DISCORD_BOT_TOKEN).catch(reject);
  });

  return readyPromise;
}

/**
 * Gets the ready Discord client instance.
 * Initializes the client if not already initialized.
 *
 * @returns {Promise<Client>} Promise that resolves with the ready Discord client
 */
async function getReadyClient() {
  return await initClient();
}

module.exports = {
  initClient,
  getReadyClient
};
