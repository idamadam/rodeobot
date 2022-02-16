const { getScores } = require('./leaderboard/getScores');

async function getWeeklyWinners() {
  const scores = await getScores('weekly');
  const winners = scores.filter(user => user.rank == 1);
  const data = {
    userIds: winners.map(winner => winner.user_id),
    winningScore: winners[0].score
  }

  return data;
}

async function sendWinnerMessage(client) {
	const winners = await getWeeklyWinners()
	const wordleChannel = client.channels.cache.find(channel => channel.name === 'wordle');
	const winnerIdString = winners.userIds.map(id => `<@${id}>`).join(' & ')
	let winnerMessage = ''
	if (winners.userIds.length == 1) {
		winnerMessage = ':drum: The Wordle winner for this week is...'
	} else if (winners.userIds.length > 1) {
		winnerMessage = ':drum: The Wordle winners for this week are..'
	}
	
	winnerMessage = winnerMessage.concat(`\n \n :trophy: ${winnerIdString} :trophy:`, '\n \n They have been given the coveted green text :green_heart:')

	wordleChannel.send(winnerMessage);
}

async function setWinnerRole(client) {
	const winners = await getWeeklyWinners()
	// This assumes the bot is only running on one server at any time
	const guild = client.guilds.cache.first()
	let winnerRole = guild.roles.cache.find(role => role.name === "wordle-winner");

	// Remove current winners
	let currentWinners = winnerRole.members
	currentWinners.forEach(member => {
	  member.roles.remove(winnerRole).catch(console.error);
	})

	// Process new winners
	winners.userIds.forEach(userId => {
		guild.members.fetch(userId).then(winner => {
			winner.roles.add(winnerRole).catch(console.error)
		})
	})
}

module.exports = {
  sendWinnerMessage,
  setWinnerRole
}