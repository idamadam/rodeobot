"use strict";

const cron = require("node-cron");
const { Events } = require("discord.js");
const sendBirthdayMessages = require("./reminders/sendBirthdayMessages");

/**
 * Starts the birthday scheduler that triggers birthday reminders on a cron schedule
 * @param {Object} params
 * @param {Client} params.client - Discord.js client instance (must be ready)
 * @param {BirthdayService} params.birthdayService - Birthday service instance
 * @param {string} params.channelId - Discord channel ID to send messages to
 * @param {string} [params.schedule] - Cron schedule string (defaults to env var or '0 8 * * *')
 * @param {Object} [params.cronScheduler] - Injectable cron implementation for tests
 * @param {Function} [params.sendMessages] - Injectable reminder workflow for tests
 * @returns {import('node-cron').ScheduledTask} The created cron task
 */
async function startBirthdayScheduler({
  client,
  birthdayService,
  channelId,
  schedule,
  cronScheduler = cron,
  sendMessages = sendBirthdayMessages,
}) {
  const cronSchedule =
    schedule || process.env.BIRTHDAY_CRON_SCHEDULE || "0 8 * * *";

  if (!cronScheduler.validate(cronSchedule)) {
    throw new Error(`Invalid birthday cron schedule: ${cronSchedule}`);
  }

  const timezone = birthdayService.timezone;

  console.log(
    `Starting birthday scheduler with schedule: "${cronSchedule}" (timezone: ${timezone})`,
  );
  console.log(`Channel ID: ${channelId}`);

  if (!client.isReady()) {
    console.log("Waiting for Discord client to be ready...");
    await new Promise((resolve) => client.once(Events.ClientReady, resolve));
  }

  console.log("Discord client is ready, scheduling birthday reminders");

  const task = cronScheduler.schedule(
    cronSchedule,
    async () => {
      console.log("Running scheduled birthday reminder check...");
      try {
        await sendMessages({ client, birthdayService, channelId });
      } catch (error) {
        console.error("Error in scheduled birthday reminder:", error.message);
        console.error("Stack trace:", error.stack);
      }
    },
    {
      name: "birthday-reminders",
      noOverlap: true,
      timezone,
    },
  );

  console.log("Birthday scheduler started successfully");

  return task;
}

module.exports = {
  startBirthdayScheduler,
};
