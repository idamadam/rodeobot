"use strict";

require("dotenv").config();
const Discord = require("discord.js");

function sendOnReady({ channelId, messages }) {
  const client = new Discord.Client();
  client.login(process.env.DISCORD_KEY);

  client.on("ready", () => {
    const channel = client.channels.cache.get(channelId);
    messages.forEach((message) => {
        channel.send(message)
    });
  });

  destroyAfterMessageCount(client, messages.length);
}

function destroyAfterMessageCount(client, killValue) {
  let botMessageCount = 0;

  client.on("message", (receivedMessage) => {
    if (receivedMessage.author == client.user) {
      botMessageCount++;
    }

    if (botMessageCount == killValue) {
      client.destroy();
    }
  });
}

module.exports = sendOnReady;
