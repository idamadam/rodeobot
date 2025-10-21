"use strict";

/**
 * Utilities for fetching and formatting Discord messages for AI context
 * Optimized for token efficiency when passing to language models
 */

/**
 * Discord epoch timestamp (2015-01-01T00:00:00.000Z)
 * @constant {number}
 */
const DISCORD_EPOCH = 1420070400000;

/**
 * Default time gap (in minutes) that indicates a topic break in conversation
 * @constant {number}
 */
const TOPIC_BREAK_MINUTES = 30;

/**
 * Converts a JavaScript Date to a Discord Snowflake ID
 * Discord Snowflakes encode timestamps, allowing us to query messages by time
 *
 * @param {Date} date - The date to convert
 * @returns {string} Discord Snowflake ID
 * @example
 * const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
 * const snowflake = timestampToSnowflake(oneHourAgo);
 */
function timestampToSnowflake(date) {
  const timestamp = date.getTime() - DISCORD_EPOCH;
  return (BigInt(timestamp) << 22n).toString();
}

/**
 * Fetches messages from a channel since a specific time
 * Uses Discord's Snowflake-based filtering for efficient queries
 *
 * @param {import('discord.js').TextChannel} channel - The Discord channel
 * @param {number} hours - Number of hours to look back
 * @returns {Promise<import('discord.js').Collection<string, import('discord.js').Message>>}
 * @example
 * const messages = await fetchMessagesSince(channel, 2); // Last 2 hours
 */
async function fetchMessagesSince(channel, hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  const afterSnowflake = timestampToSnowflake(cutoffTime);

  return await channel.messages.fetch({
    limit: 100,
    after: afterSnowflake
  });
}

/**
 * Formats a collection of Discord messages into a token-efficient string
 * Extracts only essential information: timestamp, username, content
 * Filters out empty messages and optionally bot messages
 *
 * @param {import('discord.js').Collection<string, import('discord.js').Message>} messages - Discord messages collection
 * @param {Object} options - Formatting options
 * @param {boolean} [options.includeBots=false] - Whether to include bot messages
 * @param {boolean} [options.includeAttachments=true] - Whether to indicate attachments
 * @returns {string} Formatted message history
 * @example
 * const formatted = formatMessagesEfficiently(messages);
 * // Returns: "[10:30 AM] Alice: Hello!\n[10:31 AM] Bob: Hi there!"
 */
function formatMessagesEfficiently(messages, options = {}) {
  const { includeBots = false, includeAttachments = true } = options;

  // Convert to array and sort chronologically (oldest first)
  const messageArray = Array.from(messages.values())
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return messageArray
    .filter(msg => {
      // Filter out empty messages
      if (!msg.content.trim() && msg.attachments.size === 0) return false;
      // Filter out bots if requested
      if (!includeBots && msg.author.bot) return false;
      return true;
    })
    .map(msg => {
      // Format timestamp as HH:MM
      const timestamp = new Date(msg.createdTimestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Include attachment indicator if present and requested
      const attachmentInfo = (includeAttachments && msg.attachments.size > 0)
        ? ` [${msg.attachments.size} attachment(s)]`
        : '';

      // Build message line
      const content = msg.content || '[no text]';
      return `[${timestamp}] ${msg.author.username}: ${content}${attachmentInfo}`;
    })
    .join('\n');
}

/**
 * Fetches and formats recent messages from the last N hours
 * Optimized for "recent activity" context
 *
 * @param {import('discord.js').TextChannel} channel - The Discord channel
 * @param {number} [hours=1] - Number of hours to look back (default: 1)
 * @param {Object} [options] - Formatting options (passed to formatMessagesEfficiently)
 * @returns {Promise<string>} Formatted message context
 * @example
 * const context = await getRecentContext(channel, 2);
 * // Returns last 2 hours of messages, formatted
 */
async function getRecentContext(channel, hours = 1, options = {}) {
  const messages = await fetchMessagesSince(channel, hours);
  return formatMessagesEfficiently(messages, options);
}

/**
 * Fetches and formats messages that are part of the current conversation topic
 * Detects topic breaks based on time gaps between messages
 * This provides more relevant context than just "last N messages"
 *
 * @param {import('discord.js').TextChannel} channel - The Discord channel
 * @param {number} [maxMessages=50] - Maximum messages to fetch (default: 50)
 * @param {number} [topicBreakMinutes=30] - Gap in minutes that indicates new topic (default: 30)
 * @param {Object} [options] - Formatting options
 * @returns {Promise<string>} Formatted conversation context
 * @example
 * const context = await getConversationalContext(channel);
 * // Returns messages from current conversation topic only
 */
async function getConversationalContext(
  channel,
  maxMessages = 50,
  topicBreakMinutes = TOPIC_BREAK_MINUTES,
  options = {}
) {
  const messages = await channel.messages.fetch({ limit: maxMessages });

  // Convert to array and sort chronologically (oldest first)
  const messageArray = Array.from(messages.values())
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  // Find messages in the current topic (working backwards from most recent)
  const relevantMessages = [];

  for (let i = messageArray.length - 1; i >= 0; i--) {
    const currentMsg = messageArray[i];
    relevantMessages.unshift(currentMsg);

    // Check if there's a long gap before this message
    if (i > 0) {
      const previousMsg = messageArray[i - 1];
      const timeDiffMinutes =
        (currentMsg.createdTimestamp - previousMsg.createdTimestamp) / 1000 / 60;

      // If we found a topic break, stop including older messages
      if (timeDiffMinutes > topicBreakMinutes) {
        break;
      }
    }
  }

  // Convert array back to Collection for consistent formatting
  const relevantCollection = new Map(
    relevantMessages.map(msg => [msg.id, msg])
  );

  return formatMessagesEfficiently(relevantCollection, options);
}

/**
 * Fetches and formats a fixed number of recent messages
 * Simple approach for "extended context"
 *
 * @param {import('discord.js').TextChannel} channel - The Discord channel
 * @param {number} [limit=50] - Number of messages to fetch (max 100)
 * @param {Object} [options] - Formatting options
 * @returns {Promise<string>} Formatted message context
 * @example
 * const context = await getExtendedContext(channel, 100);
 * // Returns last 100 messages, formatted
 */
async function getExtendedContext(channel, limit = 50, options = {}) {
  const messages = await channel.messages.fetch({ limit });
  return formatMessagesEfficiently(messages, options);
}

module.exports = {
  timestampToSnowflake,
  fetchMessagesSince,
  formatMessagesEfficiently,
  getRecentContext,
  getConversationalContext,
  getExtendedContext
};
