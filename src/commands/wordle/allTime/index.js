const _ = require('underscore');
const buildLeaderboard = require('./buildLeaderboard');
const getRankText = require('./getRankText');

async function calculateAllTimeLeaderboard(interaction, scores) {
  console.log(`Recieved a leaderboard request from ${interaction.user.username}`);
  const leaderboard = buildLeaderboard(scores);

  await interaction.reply({ 
    embeds: [{
      color: '#538d4e',
      author: { name: '🏆 All-time Wordle leaderboard' },
      fields: buildLeaderboardEmbedFields(leaderboard)
    }],
    ephemeral: !interaction.options.getBoolean('broadcast')
  });
}

function buildLeaderboardEmbedFields(leaderboard) {
  const ranks = _.chain(leaderboard).pluck('rank').uniq().value();

  let embeds = [];

  ranks.forEach(rank => {
    const entries = leaderboard.filter(entry => entry.rank == rank);
    const players = entries.map(entry => `<@${entry.user_id}>`).join('\n');
    const rankScore = entries[0].score

    embeds.push({
      name: getRankText(rank),
      inline: true,
      value: players.concat('\n', `${rankScore} points`)
    })
  })

  return embeds;

}

module.exports = {
  calculateAllTimeLeaderboard,
  buildLeaderboard
};