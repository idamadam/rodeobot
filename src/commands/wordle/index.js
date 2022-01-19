const { SlashCommandBuilder } = require('@discordjs/builders');
const { sendAllTimeLeaderboard } = require('./leaderboard');
const { processScoreSubmit, wordleRegex } = require('./addScore');
const { getScores } = require('./getScores');

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
	.addSubcommand(subcommand => 
    subcommand
      .setName('weekly-leaderboard')
      .setDescription('Calculate the weekly leaderboard')
      .addBooleanOption(option => 
          option.setName('broadcast')
          .setDescription('Broadcast to the group or view privately')
          .setRequired(true)
      )
  )

async function execute(interaction) {
  switch (interaction.options.getSubcommand()) {
    case 'all-time-leaderboard':
      const scores = await getScores();
      await sendAllTimeLeaderboard(interaction, scores);
      break;
  }
  
}

module.exports = {
  data: data,
  execute,
  processScoreSubmit, 
  wordleRegex
};