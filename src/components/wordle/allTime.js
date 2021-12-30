const { getScores } = require('./getScores');

function constructEmbed(data) {
  const embed = {
    color: '#538d4e',
    author: { name: '🏆 All-time Wordle leaderboard' }
  }

  embed.fields = data.map(({user_id, score}, index) => {
    return {
      name: getRank(index+1),
      value: `<@${user_id}> \n ${score} points`,
      inline: true,
    }
  });

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

  let rankText = `${ordinal(rank)} place`;

  if (rank <= 3) { rankText = emojis[rank].concat(' ', rankText) };

  return rankText;
}

async function calculateAllTimeLeaderboard(interaction) {
  const scores = await getScores();
  await interaction.reply({ 
    embeds: [constructEmbed(scores)],
    ephemeral: !interaction.options.getBoolean('broadcast')
  });
}

module.exports = calculateAllTimeLeaderboard;