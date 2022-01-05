"use strict";

const spacetime = require("spacetime");

function getFilteredList({ people, filterTime, timezone }) {
  return people.filter((person) => {
    let birthday = spacetime(`${person.birthday} ${filterTime.year()}`, timezone);
    return filterTime.isSame(birthday, "day");
  });
}

function getBirthdayWishes({ people, timezone }) {
  const filterTime = spacetime.now(timezone);
  const peopleWithBirthdays = getFilteredList({ people, filterTime, timezone });
  
  let birthdayWishes = [];

  peopleWithBirthdays.forEach((person) => {
    birthdayWishes.push(
      `Happy birthday to <@${person.discordUsername}>!!! :partying_face: :confetti_ball: :beers:`,
      `https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif`
    );
  })

  return birthdayWishes;
}

function getReminders({ people, timezone }) {
  const filterTime = spacetime.now(timezone).add(14, "days");
  const peopleWithReminders = getFilteredList({ people, filterTime, timezone });
  
  let reminders = [];

  peopleWithReminders.forEach((person) => {
    const now = spacetime.now();
    const birthday = spacetime(person.birthday + " " + now.year());
    const timeDiff = now.since(birthday).rounded;
    const formattedBirthday = birthday.format(
      "{day} the {date-ordinal} of {month-short}"
    );

    reminders.push(
      `It's <@${person.discordUsername}>'s birthday ${timeDiff} - ${formattedBirthday}. What's the plan?`
    );
  });

  return reminders;
}

module.exports = {
  getBirthdayWishes,
  getReminders
}
