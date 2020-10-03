'use strict'

require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();

const healthcheck = require("./healthcheck");

const TOKEN = process.env.TOKEN;

client.login(TOKEN);

client.on("ready", () => {
  console.info(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
  if (msg.content === "ping") {
    msg.reply("pong");
  }
});

healthcheck();