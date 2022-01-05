"use strict";

require("dotenv").config();

const init = require('./init');
const runHealthcheckServer = require('./healthcheck');
const { processScoreSubmit, wordleRegex } = require('./components/wordle/addScore');

const DISCORD_KEY = process.env.DISCORD_KEY;
const client = init();

client.login(DISCORD_KEY);

client.on('ready', () => {
	console.log('ready as ' + client.user.tag);
	runHealthcheckServer();
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.on('messageCreate', async message => {
	if (wordleRegex.test(message.content)) {
		processScoreSubmit(message, client);
	}
})