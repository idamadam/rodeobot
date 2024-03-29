const Database = require('sqlite-async');
const crypto = require('crypto');
const wordleRegex = /Wordle \d* \d\/\d/;

async function processScoreSubmit(message, client) {
  const wordleStringArray = message.content.match(/Wordle \d* \d\/\d/)[0].split(' ')
  const day = wordleStringArray[1]
  const score = wordleStringArray[2].charAt(0);
  const cowboyEyesEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'cowboyeyes');
  message.react(cowboyEyesEmoji);
  
  try {
    await writeScoreToDb({ user_id: message.author.id, day: day, score: score });
    message.react('✅');
    console.log(`Saved Wordle score for ${message.author.username}. Game #${day} - Score ${score}/6`);

    switch(score) {
      case '2':
        message.react('🔥');
        break;
      case '6':
        const oofEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'oof');
        message.react(oofEmoji);
        break;
    }
  } catch(error) {
    message.react('🚫');
    const channel = client.channels.cache.get(message.channelId);
    if (error.message == 'SQLITE_CONSTRAINT: UNIQUE constraint failed: games.id') {
      console.log(`Detected duplicate submission for ${message.author.username}. Game #${day}`);
      channel.send({
        content: `**You've already submitted a score for puzzle #${day}.** \nScores can only be submitted once per puzzle.`,
        reply: { messageReference: message.id }
      });
      return;
    }
    channel.send({
      content: `\:rotating_light: **Something went wrong with the bot, this score wasn't saved.** \:rotating_light: \n Debug: \`${error.message}\` \n cc <@689432634740441120>`,
      reply: { messageReference: message.id }
    });
    throw error;
  }
}

async function writeScoreToDb({ user_id, day, score }) {
  const entryId = crypto.createHash('md5').update(`${user_id} ${day}`).digest('hex');

  const sql = `INSERT INTO 
                games (id, user_id, timestamp, day, score)
              VALUES 
                ('${entryId}', ${user_id}, datetime('now'), ${day}, ${score})`

  const db = await Database.open(process.env.DB_PATH);
  await db.run(sql)
  await db.close();
}


module.exports = {
  processScoreSubmit,
  wordleRegex
};