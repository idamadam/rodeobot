const { SlashCommandBuilder } = require('@discordjs/builders');
const allTime = require('./allTime');
const { processScoreSubmit, wordleRegex } = require('./addScore');

const data = new SlashCommandBuilder()
	.setName('wordle')
	.setDescription('Calculate wordle leaderboard')
	.addSubcommand(subcommand => 
    subcommand
      .setName('all-time-leaderboard')
      .setDescription('Calculate the all-time leaderboard')
      .addBooleanOption(option => 
          option.setName('broadcast')
          .setDescription('Broadcast to the group or view privately')
          .setRequired(true)
      )
  )

async function execute(interaction) {
  switch (interaction.options.getSubcommand()) {
    case 'all-time-leaderboard':
      await allTime(interaction);
      break;
  }
  
}

module.exports = {
  data: data,
  execute,
  processScoreSubmit, 
  wordleRegex
};