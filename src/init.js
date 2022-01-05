"use strict";

const fs = require('fs');
const Database = require('sqlite-async');
const { Client, Collection, Intents } = require("discord.js");

function initDb() {
  Database.open(process.env.DB_PATH)
	.then(db => {
		db.run(`CREATE TABLE IF NOT EXISTS games (
			"id"	TEXT NOT NULL,
			"user_id"	INTEGER NOT NULL,
			"day"	INTEGER NOT NULL,
			"timestamp"	TEXT NOT NULL,
			"score"	INTEGER NOT NULL,
			PRIMARY KEY("id")
		)`)
		db.close();
	})
	.catch(error => {
		throw error
	})
}

function initDiscordClient() {
	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
	});
	
	client.commands = new Collection();
	const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));
	
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		// Set a new item in the Collection
		// With the key as the command name and the value as the exported module
		client.commands.set(command.data.name, command);
	}
	
	return client
}


function init() {
	initDb();
	const client = initDiscordClient();
	return client;
}

module.exports = init;