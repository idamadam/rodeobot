"use strict";

const spacetime = require("spacetime");

class BirthdayService {
  constructor(
    timezone = "Australia/Melbourne",
    reminderDays = 14,
    nowProvider = spacetime.now,
  ) {
    this.timezone = timezone;
    this.reminderDays = reminderDays;
    this.nowProvider = nowProvider;
  }

  getBirthdayMessages(friends) {
    const now = this.nowProvider(this.timezone);
    const remindDate = now.add(this.reminderDays, "days");
    const messages = [];

    friends.forEach((person) => {
      const birthdayThisYear = this.getBirthdayInYear(
        person.birthday,
        now.year(),
      );

      // Today's birthday
      if (birthdayThisYear.isSame(now, "day")) {
        messages.push(
          `Happy birthday to <@${person.discordUserId}>!!! :partying_face: :confetti_ball: :beers:`,
          "https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif",
        );
      }

      const upcomingBirthday = this.getBirthdayInYear(
        person.birthday,
        remindDate.year(),
      );

      // Upcoming birthday
      if (upcomingBirthday.isSame(remindDate, "day")) {
        const formattedDate = upcomingBirthday.format(
          "{day} the {date-ordinal} of {month-short}",
        );
        messages.push(
          `It's <@${person.discordUserId}>'s birthday in ${this.reminderDays} days - ${formattedDate}. What's the plan?`,
        );
      }
    });

    return messages;
  }

  getBirthdayInYear(birthday, year) {
    return spacetime(`${birthday} ${year}`, this.timezone);
  }
}

module.exports = BirthdayService;
