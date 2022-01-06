const _ = require('underscore');

function buildLeaderboard(scores, rankCount = 1) {
  // Determine the maximum rank, this is used in the for loop below
  const maxRank = _.max(scores, 'rank').rank;
  
  let leaderboard = [];

  // Iterate over every rank and construct an embed field for each rank
  for (let rank = 1; rank <= maxRank; rank++) {
    const scoresWithRank = _.filter(scores, score => rank == score.rank);
    const playersWithRank = scoresWithRank.map(score => score.user_id);
    const rankScore = scoresWithRank[0].score;

    playersWithRank.forEach(playerId => {
      leaderboard.push({
        rank: rankCount,
        score: rankScore,
        user_id: playerId
      })
    })

    // Add to rank depending on how many people are within a rank.
    rankCount = rankCount + scoresWithRank.length;
  }

  return leaderboard;
}

module.exports = buildLeaderboard;