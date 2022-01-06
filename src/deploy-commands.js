require("dotenv").config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const DISCORD_KEY = process.env.DISCORD_KEY;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [];
const commandDirs = fs.readdirSync('./src/commands', { withFileTypes: true })
.filter(dirent => dirent.isDirectory())
.map(dirent => dirent.name);

commandDirs.forEach(dirent => {
	const command = require(`./commands/${dirent}`);
	commands.push(command.data.toJSON());
})

const rest = new REST({ version: '9' }).setToken(DISCORD_KEY);

(async () => {
	try {
		console.log('Started refreshing slash commands.');

		await rest.put(
			Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
			{ body: commands },
		);

		commands.forEach(command => {
			console.log(`Loaded ${command.name}`)
		})

		console.log('Successfully reloaded slash commands.');
	} catch (error) {
		console.error(error);
	}
})();