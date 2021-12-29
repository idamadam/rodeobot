"use strict";

require("dotenv").config();

const fs = require('fs');
const { Client, Collection, Intents } = require("discord.js");
const Database = require('sqlite-async');

const Healthcheck = require('./healthcheck');
const { processScoreSubmit, wordleRegex } = require('./components/wordle/addScore');

Healthcheck();

Database.open('./db/rodeo.db')
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
	});

const DISCORD_KEY = process.env.DISCORD_KEY;

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

client.login(DISCORD_KEY);

client.on('ready', () => {
	console.log('ready as ' + client.user.tag)
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