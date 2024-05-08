"use strict";

require("dotenv").config();

const { initDiscordClient } = require('./init');
const sendBirthdayMessages = require('./scheduled');

const DISCORD_KEY = process.env.DISCORD_KEY;

const client = initDiscordClient();

client.login(DISCORD_KEY);

client.on('ready', () => {
	console.log('ready as ' + client.user.tag);
	sendBirthdayMessages(client);
	client.destroy();
});
