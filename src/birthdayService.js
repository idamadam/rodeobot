const spacetime = require("spacetime");

class BirthdayService {
  constructor(timezone = "Australia/Melbourne", reminderDays = 14) {
    this.timezone = timezone;
    this.reminderDays = reminderDays;
  }

  getBirthdayMessages(friends) {
    const now = spacetime.now(this.timezone);
    const remindDate = now.add(this.reminderDays, "days");
    const messages = [];

    friends.forEach(person => {
      const birthday = spacetime(`${person.birthday} ${now.year()}`, this.timezone);
      
      // Today's birthday
      if (birthday.isSame(now, "day")) {
        messages.push(
          `Happy birthday to <@${person.discordUsername}>!!! :partying_face: :confetti_ball: :beers:`,
          'https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif'
        );
      }
      
      // Upcoming birthday
      if (birthday.isSame(remindDate, "day")) {
        const formattedDate = birthday.format("{day} the {date-ordinal} of {month-short}");
        messages.push(
          `It's <@${person.discordUsername}>'s birthday in ${this.reminderDays} days - ${formattedDate}. What's the plan?`
        );
      }
    });

    return messages;
  }
}

module.exports = BirthdayService; 