"use strict";

const { Client, Intents } = require("discord.js");


function initDiscordClient() {
	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
	});
	
	return client
}

module.exports = {
	initDiscordClient
}