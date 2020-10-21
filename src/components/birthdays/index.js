"use strict";

require("dotenv").config(); 
const Discord = require("discord.js");
const spacetime = require("spacetime");

const friends = require("./../../../friends.json");

function getBirthdayPeople(people, timezone) {
    return people.filter((person) => {
        const now = spacetime.now(timezone);
        let birthday = spacetime(person.birthday, timezone);
        return now.isSame(birthday, "day");
    })
}

function sendWish(timezone) {
  const client = new Discord.Client();
  const birthdayPeople = getBirthdayPeople(friends, timezone);

  if (Object.keys(birthdayPeople).length == 0) {
    console.log("It's no one's birthday today.");
    return;
  }
  
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

    return;
  });
}

module.exports = { 
  sendWish
}