"use strict";

require("dotenv").config();

const { initDb, initDiscordClient } = require('./init');
const runHealthcheckServer = require('./components/healthcheck');
const { processScoreSubmit, wordleRegex } = require('./components/wordle/addScore');
const runScheduledMessages = require('./scheduled');

const DISCORD_KEY = process.env.DISCORD_KEY;

initDb();
const client = initDiscordClient();

client.login(DISCORD_KEY);

client.on('ready', () => {
	console.log('ready as ' + client.user.tag);
	runScheduledMessages();
	runHealthcheckServer();
});

// This runs on any message
client.on('messageCreate', async message => {
	// Check if the message matches the Wordle regex /Wordle \d* \d\/\d/
	if (wordleRegex.test(message.content)) {
		processScoreSubmit(message, client);
	}
})