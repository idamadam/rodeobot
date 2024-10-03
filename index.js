"use strict";

require("dotenv").config();
const spacetime = require("spacetime");
const { Client, GatewayIntentBits } = require('discord.js');

let friends;
try {
  // Remove the EOF markers and any leading/trailing whitespace
  const friendsData = process.env.FRIENDS_DATA.replace(/(^<<EOF\s*|\s*EOF$)/gm, '').trim();
  friends = JSON.parse(friendsData);
  console.log(`Loaded data for ${friends.length} friends.`);
} catch (error) {
  console.error('Error parsing FRIENDS_DATA:', error);
  process.exit(1);
}

const BirthdayBot = {
  TIMEZONE: "Australia/Melbourne",
  REMINDER_DAYS: 14,

  // Message templates
  MESSAGES: {
    BIRTHDAY_WISH: 'Happy birthday to <@{username}>!!! :partying_face: :confetti_ball: :beers:',
    BIRTHDAY_GIF: 'https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif',
    REMINDER: "It's <@{username}>'s birthday in {days} days - {formattedDate}. What's the plan?"
  },

  /**
   * Finds people whose birthdays match a given date.
   * @param {Array} people - List of people with their birthday information.
   * @param {spacetime} date - The date to check against.
   * @returns {Array} - List of people with matching birthdays.
   */
  getMatchingBirthdays(people, date) {
    return people.filter(person => 
      spacetime(`${person.birthday} ${date.year()}`, this.TIMEZONE).isSame(date, "day")
    );
  },

  /**
   * Formats a birthday date string into a readable format.
   * @param {string} birthday - Birthday date string.
   * @returns {string} - Formatted birthday string.
   */
  formatBirthday(birthday) {
    return spacetime(birthday, this.TIMEZONE).format("{day} the {date-ordinal} of {month-short}");
  },

  /**
   * Builds birthday messages and reminders for the given list of people.
   * @param {Array} people - List of people with their birthday information.
   * @returns {Array} - List of birthday messages and reminders.
   */
  buildMessages(people) {
    const now = spacetime.now(this.TIMEZONE);
    const remindDate = now.add(this.REMINDER_DAYS, "days");
    
    const todaysBirthdays = this.getMatchingBirthdays(people, now);
    const upcomingBirthdays = this.getMatchingBirthdays(people, remindDate);
    
    const wishes = todaysBirthdays.flatMap(person => [
      this.MESSAGES.BIRTHDAY_WISH.replace('{username}', person.discordUsername),
      this.MESSAGES.BIRTHDAY_GIF
    ]);

    const reminders = upcomingBirthdays.map(person => 
      this.MESSAGES.REMINDER
        .replace('{username}', person.discordUsername)
        .replace('{days}', this.REMINDER_DAYS)
        .replace('{formattedDate}', this.formatBirthday(person.birthday))
    );

    const messages = [...wishes, ...reminders];

    console.log(`Built ${wishes.length/2} birthday messages & ${reminders.length} birthday reminders.`);
    return messages;
  },

  /**
   * Sends messages to a specified Discord channel.
   * @param {Client} client - Discord client object.
   * @param {Array} messages - List of messages to send.
   */
  async sendMessages(client, messages) {
    const channel = client.channels.cache.get(process.env.GENERAL_CHANNEL_ID);
    for (const message of messages) {
      await channel.send(message);
    }
  },

  /**
   * Main function to run the birthday bot.
   * Builds messages, logs into Discord if necessary, and sends messages.
   */
  async run() {
    const messages = this.buildMessages(friends);

    if (messages.length > 0) {
      const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
      });

      client.once('ready', async () => {
        console.log('Logged in to Discord. Sending birthday messages...');
        await this.sendMessages(client, messages);
        console.log('Birthday messages sent. Logging out...');
        client.destroy();
      });

      try {
        await client.login(process.env.DISCORD_BOT_TOKEN);
      } catch (error) {
        console.error('Failed to log in to Discord:', error);
      }
    } else {
      console.log('No messages to send. Skipping Discord login.');
    }
  }
};

// Run the script
BirthdayBot.run().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});