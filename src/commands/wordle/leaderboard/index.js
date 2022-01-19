const _ = require('underscore');
const buildLeaderboard = require('./buildLeaderboard');
const getRankText = require('./getRankText');

async function sendLeaderboard(interaction, scores, type = "all-time") {

  const requestType = (interaction.options.getBoolean('broadcast')) ? 'public' : 'private'

  console.log(`Recieved a ${requestType} ${type} leaderboard request from ${interaction.user.username}`);
  const leaderboard = buildLeaderboard(scores);

  // This creates a capitalised version of the Leaderboard type
  const leaderBoardTypeString = type.charAt(0).toUpperCase() + type.slice(1);

  await interaction.reply({ 
    embeds: [{
      color: '#538d4e',
      author: { name: `🏆 ${leaderBoardTypeString} Wordle leaderboard` },
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
  sendLeaderboard,
  buildLeaderboard
};