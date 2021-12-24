const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const Uwuifier = require('uwuifier');
const fetch = require("node-fetch");
const spacetime = require("spacetime");

const uwu = new Uwuifier();

const data = new SlashCommandBuilder()
	.setName('uwu')
	.setDescription('Translate tweet to uwu')
	.addStringOption(option => option.setName('tweet-link').setDescription('Link of the tweet to uwuify').setRequired(true));

function getTweetId(tweetUrl) {
	const testRegex = /https?:\/\/twitter.com\/\w+\/status\/\d+/

	if (testRegex.test(tweetUrl)) {
		return tweetUrl.match(/\d+/)
	} else {
		console.error(error);
		throw 'I can only translate links from Twitter';
	}
}

async function getTweet(tweetId) {
	const params = new URLSearchParams({
		expansions: 'author_id',
		'user.fields': 'name,username,profile_image_url',
		'tweet.fields': 'created_at'
	});

	try {
		const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?${params.toString()}`, {
			headers: {
				Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
			},
		})
		const responseJson = await response.json();
		
		return {
			text: responseJson.data.text,
			name: responseJson.includes.users[0].name,
			username: responseJson.includes.users[0].username,
			profile_image_url: responseJson.includes.users[0].profile_image_url,
			created_at: responseJson.data.created_at,
		}
	} catch(error) {
		console.error(error);
		throw("I couldn't translate the tweet");
	}

}

function constructEmbed(tweet) {
	const authorName = `${uwu.uwuifyWords(tweet.name)} (${tweet.username})`
	const createdDate = spacetime(tweet.created_at)

	return new MessageEmbed()
		.setColor('#1da0f2')
		.setAuthor(authorName, tweet.profile_image_url, `https://twitter.com/${tweet.username}`)
		.setDescription(uwu.uwuifySentence(tweet.text))
		.setFooter(`Twittew • ${createdDate.format('numeric-uk')}`, 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png')
}

async function execute(interaction) {
	try { 
		const tweetURL = interaction.options.getString('tweet-link');
		const tweetId = getTweetId(tweetURL);
		const tweet = await getTweet(tweetId);
		await interaction.reply({
			content: tweetURL,
			embeds: [constructEmbed(tweet)]
		});
	} catch(error) {
		console.error(error)
		await interaction.reply({ 
			content: uwu.uwuifySentence(error),
			ephemeral: true
		});
	}

}

module.exports = {
	data: data,
	execute
};