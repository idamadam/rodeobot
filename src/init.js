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
	const commandDirs = fs.readdirSync('./src/commands', { withFileTypes: true })
													.filter(dirent => dirent.isDirectory())
													.map(dirent => dirent.name);
	
	commandDirs.forEach(dirent => {
		const command = require(`./commands/${dirent}`);
		// Set a new item in the Collection
		// With the key as the command name and the value as the exported module
		client.commands.set(command.data.name, command);
	});

	// This runs on any slash command interaction 
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
	
	return client
}

module.exports = {
	initDb,
	initDiscordClient
}