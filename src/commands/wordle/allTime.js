const _ = require('underscore');
const { getScores } = require('./getScores');

async function calculateAllTimeLeaderboard(interaction) {
  console.log(`Recieved a leaderboard request from ${interaction.user.username}`);
  const scores = await getScores();
  await interaction.reply({ 
    embeds: [constructEmbed(scores)],
    ephemeral: !interaction.options.getBoolean('broadcast')
  });
}

function constructEmbed(data) {
  // Start constructing the leaderboard embed
  let embed = {
    color: '#538d4e',
    author: { name: '🏆 All-time Wordle leaderboard' }
  }

  // Determine the maximum rank, this is used in the for loop below
  const maxRank = _.max(data, 'rank').rank;

  // Initialise the fields in the embed, each object in the array will be a place
  embed.fields = [];
  let rankCount = 1;

  // Iterate over every rank and construct an embed field for each rank
  for (let rank = 1; rank <= maxRank; rank++) {
    const dataWithRank = _.filter(data, function(score) { return rank == score.rank });
    const playersWithRank = dataWithRank.map((score) => { return `<@${score.user_id}>` }).join('\n');
    const rankScore = dataWithRank[0].score;
    
    const embedField = {
      name: getRankText(rankCount),
      inline: true,
      value: playersWithRank.concat('\n', `${rankScore} points`)
    }

    // Add to rank depending on how many people are within a rank.
    rankCount = rankCount + dataWithRank.length;
    embed.fields.push(embedField);
  }

  return embed;
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

module.exports = calculateAllTimeLeaderboard;