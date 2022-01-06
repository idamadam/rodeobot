const _ = require('underscore');
const getRankText = require('./getRankText');

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

module.exports = buildLeaderboard;