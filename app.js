'use strict'

require("dotenv").config();
const Discord = require("discord.js");
const client = new Discord.Client();
const express = require("express");

const PORT = process.env.PORT;
const TOKEN = process.env.TOKEN;

const app = express();

client.login(TOKEN);

client.on("ready", () => {
  console.info(`Logged in as ${client.user.tag}!`);
});

client.on("message", (msg) => {
  if (msg.content === "ping") {
    msg.reply("pong");
  }
});

app.get("/healthz", (req, res) => {
  res.json({ status: "UP" });
});

app.listen(PORT, () => {});
