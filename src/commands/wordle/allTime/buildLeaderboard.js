const _ = require('underscore');

function buildLeaderboard(scores, rankCount = 1) {
  // Determine the maximum rank, this is used in the for loop below
  const maxRank = _.max(scores, 'rank').rank;
  
  let leaderboard = [];

  // Iterate over every rank and rebuild the array with the adjusted rank
  for (let rank = 1; rank <= maxRank; rank++) {
    const scoresWithRank = scores.filter(score => rank == score.rank);
    const players = scoresWithRank.map(score => score.user_id);
    const rankScore = scores[0].score;

    players.forEach(playerId => {
      leaderboard.push({
        rank: rankCount,
        score: rankScore,
        user_id: playerId
      })
    });

    // Add to rank depending on how many people are within a rank.
    rankCount = rankCount + scoresWithRank.length;
  }

  return leaderboard;
}

module.exports = buildLeaderboard;