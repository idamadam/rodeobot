const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const Uwuifier = require('uwuifier');
const spacetime = require("spacetime");

const { getTweetId, getTweet } = require('./tweet');

const uwu = new Uwuifier();

const data = new SlashCommandBuilder()
	.setName('uwu')
	.setDescription('Translate tweet to uwu')
	.addStringOption(option => option.setName('tweet-link').setDescription('Link of the tweet to uwuify').setRequired(true));

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