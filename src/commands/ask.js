"use strict";

const { SlashCommandBuilder } = require('discord.js');
const { anthropic } = require('@ai-sdk/anthropic');
const { generateText } = require('ai');
const {
  getRecentContext,
  getConversationalContext,
  getExtendedContext
} = require('../utils/messageContext');

/**
 * Handles the /ask slash command
 * Queries Claude with configurable Discord channel context
 *
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object
 */
async function handleAsk(interaction) {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      await interaction.reply({
        content: '❌ ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.',
        ephemeral: true
      });
      return;
    }

    // Defer reply since AI calls can take time
    await interaction.deferReply();

    // Extract command options
    const question = interaction.options.getString('question');
    const contextType = interaction.options.getString('context') || 'conversation';

    let context = '';

    // Fetch appropriate context based on user selection
    switch (contextType) {
      case 'none':
        // No context needed
        context = '';
        break;

      case 'recent':
        // Last hour of messages
        context = await getRecentContext(interaction.channel, 1);
        break;

      case 'conversation':
        // Current conversation topic (stops at 30min gaps)
        context = await getConversationalContext(interaction.channel);
        break;

      case 'extended':
        // Last 50 messages
        context = await getExtendedContext(interaction.channel, 50);
        break;

      default:
        // Fallback to conversation
        context = await getConversationalContext(interaction.channel);
    }

    // Build the prompt
    const prompt = context
      ? `Here's the recent conversation in this Discord channel:\n\n${context}\n\nQuestion: ${question}`
      : question;

    // Call Claude API
    const { text } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: 'You are a helpful AI assistant in a Discord server. Answer questions based on the conversation context provided. Be concise and friendly.',
      prompt: prompt,
      maxTokens: 1024,
    });

    // Discord has a 2000 character limit for messages
    // If response is too long, truncate it
    const response = text.length > 1900
      ? text.substring(0, 1900) + '\n\n_[Response truncated due to length]_'
      : text;

    // Reply with Claude's response
    await interaction.editReply(response);

  } catch (error) {
    console.error('Error in ask command:', error);

    // Prepare error message
    let errorMessage = '❌ Something went wrong while getting a response from Claude.';

    // Provide more specific error messages for common issues
    if (error.message?.includes('API key')) {
      errorMessage = '❌ Invalid Anthropic API key. Please check your configuration.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = '❌ Rate limit exceeded. Please try again in a moment.';
    } else if (error.message?.includes('context_length_exceeded')) {
      errorMessage = '❌ Too much context. Try using less context (e.g., "recent" instead of "extended").';
    }

    // Send error message to user
    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

// Define the slash command
const askCommand = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('Ask Claude a question with channel context')
  .addStringOption(option =>
    option
      .setName('question')
      .setDescription('Your question for Claude')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('context')
      .setDescription('How much conversation context to include')
      .setRequired(false)
      .addChoices(
        { name: 'None (just the question)', value: 'none' },
        { name: 'Recent (last hour)', value: 'recent' },
        { name: 'Conversation (current topic) [default]', value: 'conversation' },
        { name: 'Extended (last 50 messages)', value: 'extended' }
      )
  );

module.exports = {
  data: askCommand,
  execute: handleAsk
};
