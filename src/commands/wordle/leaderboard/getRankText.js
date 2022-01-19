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

module.exports = getRankText;