const buildLeaderboard = require('./buildLeaderboard');

async function calculateAllTimeLeaderboard(interaction, scores) {
  console.log(`Recieved a leaderboard request from ${interaction.user.username}`);

  await interaction.reply({ 
    embeds: [{
      color: '#538d4e',
      author: { name: '🏆 All-time Wordle leaderboard' },
      fields: buildLeaderboard(scores)
    }],
    ephemeral: !interaction.options.getBoolean('broadcast')
  });
}

module.exports = {
  calculateAllTimeLeaderboard,
  buildLeaderboard
};