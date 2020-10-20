"use strict";

require("dotenv").config(); 
const Discord = require("discord.js");
const spacetime = require("spacetime");

const friends = require("./../../../friends.json");
const client = new Discord.Client();

function getBirthdayPeople(people, timezone) {
    return people.filter((person) => {
        const now = spacetime.now(timezone);
        let birthday = spacetime(person.birthday, timezone);
        return now.isSame(birthday, "day");
    })
}

function sendWish(timezone) {
  const birthdayPeople = getBirthdayPeople(friends, timezone);
  
  client.login(process.env.DISCORD_KEY);

  client.on("ready", () => {
    const channel = client.channels.cache.get(process.env.GENERAL_CHANNEL_ID);

    birthdayPeople.forEach(async (person) => {
      console.log(`Wished ${person.name} a Happy Birthday!`);
      channel.send(
        `Happy birthday to <@${person.discordUsername}>!!! :partying_face: :confetti_ball: :beers:`
      );
      channel.send(
        "https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif"
      );
    });
  });
}

module.exports = { 
  sendWish
}