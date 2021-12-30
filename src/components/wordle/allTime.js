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
  let embed = {
    color: '#538d4e',
    author: { name: '🏆 All-time Wordle leaderboard' }
  }

  const maxRank = _.max(data, 'rank').rank;

  embed.fields = [];

  for (let rank = 1; rank <= maxRank; rank++) {
    const dataWithRank = _.filter(data, function(score) { return rank == score.rank });
    const playersWithRank = dataWithRank.map((score) => { return `<@${score.user_id}>` }).join('\n');
    const rankScore = dataWithRank[0].score;
    
    const embedField = {
      name: getRank(rank),
      inline: true,
      value: playersWithRank.concat('\n', `${rankScore} points`)
    }

    embed.fields.push(embedField);
  }

  return embed;
}


function getRank(rank) {
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