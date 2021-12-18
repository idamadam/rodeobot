const { SlashCommandBuilder } = require('@discordjs/builders');
const Uwuifier = require('uwuifier');
const fetch = require("node-fetch");

const uwu = new Uwuifier();

const data = new SlashCommandBuilder()
	.setName('twuvu')
	.setDescription('Translate tweet to uwu')
	.addStringOption(option => option.setName('tweet-link').setDescription('Link of the tweet to uwuify').setRequired(true));

function getTweetId(tweetUrl) {
	const testRegex = /https?:\/\/twitter.com\/\w+\/status\/\d+/

	if (testRegex.test(tweetUrl)) {
		return tweetUrl.match(/\d+/)
	} else {
		throw 'Not a valid Tweet URL';
	}
}

async function getTweet(tweetId) {

	try {
		const response = await fetch(`https://api.twitter.com/2/tweets?ids=${tweetId}`, {
			headers: {
				Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
			}
		})
		const responseJson = await response.json();
		console.log(responseJson);
		return responseJson.data[0].text;
	} catch {
		throw("Couldn't parse the tweet");
	}

}

async function execute(interaction) {
	const tweetURL = interaction.options.getString('tweet-link');
	const tweetId = getTweetId(tweetURL);
	const tweetContent = await getTweet(tweetId);
	const response = uwu.uwuifyWords(tweetContent);
	await interaction.reply(response);
}

module.exports = {
	data: data,
	execute
};