"use strict";

require("dotenv").config();
const Discord = require("discord.js");
const _ = require("underscore");
const client = new Discord.Client();

const qldBorder = require("./components/qldBorder");
const healthcheck = require("./healthcheck");

const DISCORD_KEY = process.env.DISCORD_KEY;

client.login(DISCORD_KEY);

client.on("ready", () => {
  console.info(`Logged in as ${client.user.tag}!`);
  healthcheck();
});

client.on("message", async (msg) => {
  try {
    let lowercaseMessage = msg.content.toLowerCase();

    if (_.contains(qldBorder.acceptedMessages, lowercaseMessage)) {
      console.log(`Recieved a Qld border question from ${msg.author.username}`);
      await qldBorder.checkIfOpen(msg);
    }
  } catch (e) {
    console.error(e);
    msg.channel.send("Oh no, the bot iws bwoken.");
  }
});
