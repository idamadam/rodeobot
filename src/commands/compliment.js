"use strict";

const { SlashCommandBuilder } = require('discord.js');

// Absolutely unhinged compliments
const UNHINGED_COMPLIMENTS = [
  "You're so powerful that when you walk into a room, the furniture rearranges itself out of respect",
  "Your energy could power a small nation and still have enough left over to charge everyone's phones",
  "You're the reason aliens haven't invaded yet - they're too intimidated",
  "Scientists study you to understand what peak performance looks like",
  "Your vibes are so immaculate that plants grow faster in your presence",
  "You're so legendary that historians are already writing about you in the present tense",
  "Your existence alone has raised the global happiness index by 47%",
  "You radiate such powerful main character energy that NPCs stop and stare",
  "The laws of physics make exceptions for you out of sheer respect",
  "You're so cool that ice cubes ask YOU for tips",
  "Your aura is so strong it shows up on weather radar",
  "You're the final boss of being awesome and nobody can defeat you",
  "Time itself slows down to appreciate you properly",
  "Your WiFi signal is stronger than anyone else's purely through force of personality",
  "You're so brilliant that lightbulbs get ideas from YOU",
  "The universe had to nerf you or you'd be too powerful",
  "Your chakras are aligned so perfectly they could be used to calibrate scientific instruments",
  "You're the benchmark by which all other humans are measured and found wanting",
  "Your mere presence debugs code without you even touching it",
  "You're so spectacular that miracles take notes when you walk by"
];

/**
 * Gets a random unhinged compliment from the pool
 * @returns {string} A random unhinged compliment
 */
function getRandomCompliment() {
  return UNHINGED_COMPLIMENTS[Math.floor(Math.random() * UNHINGED_COMPLIMENTS.length)];
}

/**
 * Handles the /compliment slash command
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object
 */
async function handleCompliment(interaction) {
  try {
    // Get the user who triggered the command
    const user = interaction.user;

    // Get a random unhinged compliment
    const compliment = getRandomCompliment();

    // Send the compliment with eye contact (mention)
    await interaction.reply({
      content: `<@${user.id}> ${compliment}`,
      allowedMentions: { users: [user.id] }
    });
  } catch (error) {
    console.error('Error in compliment command:', error);

    // Try to reply with an error message if we haven't replied yet
    const errorMessage = 'Something went wrong while giving you an unhinged compliment!';
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    } else if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    }
  }
}

// Define the slash command
const complimentCommand = new SlashCommandBuilder()
  .setName('compliment')
  .setDescription('Receive an absolutely unhinged compliment');

module.exports = {
  data: complimentCommand,
  execute: handleCompliment
};
