'use strict'

require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();

const isQldOpen = require("./is-qld-open");
const healthcheck = require("./healthcheck");

const TOKEN = process.env.TOKEN;

client.login(TOKEN);

client.on("ready", () => {
  console.info(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
  let lowercaseMessage = msg.content.toLowerCase();
  
  if (lowercaseMessage === "can i go to brisbane?") {
    let qldOpen = isQldOpen();

    if (qldOpen) {
      msg.channel.send("yes");
    } else {
      msg.channel.send("no");
    }
  }
  
});

healthcheck();