"use strict";

require("dotenv").config();
const Discord = require("discord.js");
const _ = require("underscore");
const client = new Discord.Client();

const qldBorder = require("./qldBorder");
const healthcheck = require("./healthcheck");

const TOKEN = process.env.TOKEN;

client.login(TOKEN);

client.on("ready", () => {
  console.info(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (msg) => {
  try {
    let lowercaseMessage = msg.content.toLowerCase();

    if (_.contains(qldBorder.acceptedMessages, lowercaseMessage)) {
      await qldBorder.checkIfOpen(msg);
    }
  } catch (e) {
    console.error(e);
    msg.channel.send("Oh no, the bot iws bwoken.");
  }
});

healthcheck();
