"use strict";

const spacetime = require("spacetime");

function getMessages({ people, timezone, messageType = "birthdays" }) {
  let filterTime;

  if (messageType === "birthdays") {
    filterTime = spacetime.now(timezone);
  } else if (messageType === "reminders") {
    filterTime = spacetime.now(timezone).add(14, "days");
  }

  const filteredList = people.filter((person) => {
    let birthday = spacetime(`${person.birthday} ${filterTime.year()}`, timezone);
    return filterTime.isSame(birthday, "day");
  });

  let messages = [];

  if (messageType === "birthdays") {
    filteredList.forEach((person) => {
      messages.push(
        `Happy birthday to <@${person.discordUsername}>!!! :partying_face: :confetti_ball: :beers:`
      );
      messages.push(
        `https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif`
      );
    });
  } else if (messageType === "reminders") {
    filteredList.forEach((person) => {
      const now = spacetime.now();
      const birthday = spacetime(person.birthday + " " + now.year());
      const timeDiff = now.since(birthday).rounded;
      const formattedBirthday = birthday.format(
        "{day} the {date-ordinal} of {month-short}"
      );

      messages.push(
        `It's <@${person.discordUsername}>'s birthday ${timeDiff} - ${formattedBirthday}. What's the plan?`
      );
    });
  }

  return messages;
}

module.exports = getMessages;
