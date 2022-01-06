const _ = require('underscore');

async function calculateAllTimeLeaderboard(interaction, scores) {
  console.log(`Recieved a leaderboard request from ${interaction.user.username}`);

  // Start constructing the leaderboard embed
  let embed = {
    color: '#538d4e',
    author: { name: '🏆 All-time Wordle leaderboard' }
  }

  embed.fields = buildLeaderboard(scores);

  await interaction.reply({ 
    embeds: [embed],
    ephemeral: !interaction.options.getBoolean('broadcast')
  });
}

function buildLeaderboard(scores, rankCount = 1) {
  // Determine the maximum rank, this is used in the for loop below
  const maxRank = _.max(scores, 'rank').rank;
  
  let fields = [];

  // Iterate over every rank and construct an embed field for each rank
  for (let rank = 1; rank <= maxRank; rank++) {
    const scoresWithRank = _.filter(scores, function(score) { return rank == score.rank });
    const playersWithRank = scoresWithRank.map((score) => { return `<@${score.user_id}>` }).join('\n');
    const rankScore = scoresWithRank[0].score;
    
    const embedField = {
      name: getRankText(rankCount),
      inline: true,
      value: playersWithRank.concat('\n', `${rankScore} points`)
    }

    // Add to rank depending on how many people are within a rank.
    rankCount = rankCount + scoresWithRank.length;
    fields.push(embedField);
  }

  return fields;
}

function getRankText(rank) {
  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n%100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }
  
  let emojis = {
    1: '🥇',
    2: '🥈', 
    3: '🥉', 
  };

  let rankText = `**${ordinal(rank)} place**`;

  if (rank <= 3) { 
    rankText = emojis[rank].concat(' ', rankText) } 
  else {
    rankText = '\:star:'.concat(' ', rankText)
  };

  return rankText;
}

module.exports = {
  calculateAllTimeLeaderboard,
  buildLeaderboard
};