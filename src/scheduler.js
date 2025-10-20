"use strict";

const cron = require("node-cron");
const sendBirthdayMessages = require("./reminders/sendBirthdayMessages");

/**
 * Starts the birthday scheduler that triggers birthday reminders on a cron schedule
 * @param {Object} params
 * @param {Client} params.client - Discord.js client instance (must be ready)
 * @param {BirthdayService} params.birthdayService - Birthday service instance
 * @param {string} params.channelId - Discord channel ID to send messages to
 * @param {string} [params.schedule] - Cron schedule string (defaults to env var or '0 8 * * *')
 * @returns {import('node-cron').ScheduledTask} The created cron task
 */
async function startBirthdayScheduler({
    client,
    birthdayService,
    channelId,
    schedule,
}) {
    // Get schedule from parameter, env var, or default
    const cronSchedule =
        schedule || process.env.BIRTHDAY_CRON_SCHEDULE || "0 9 * * *";

    // Get timezone from birthday service
    const timezone = birthdayService.timezone;

    console.log(
        `Starting birthday scheduler with schedule: "${cronSchedule}" (timezone: ${timezone})`,
    );
    console.log(`Channel ID: ${channelId}`);

    // Await client ready state
    // Note: client should already be ready when passed in, but we ensure it here
    if (!client.isReady()) {
        console.log("Waiting for Discord client to be ready...");
        await new Promise((resolve) => client.once("ready", resolve));
    }

    console.log("Discord client is ready, scheduling birthday reminders");

    // Schedule the cron job
    const task = cron.schedule(
        cronSchedule,
        async () => {
            console.log("Running scheduled birthday reminder check...");
            try {
                await sendBirthdayMessages({
                    client,
                    birthdayService,
                    channelId,
                });
            } catch (error) {
                console.error(
                    "Error in scheduled birthday reminder:",
                    error.message,
                );
                console.error("Stack trace:", error.stack);
                // Don't crash the process - just log and continue
            }
        },
        {
            scheduled: true,
            timezone: timezone,
        },
    );

    console.log("Birthday scheduler started successfully");

    return task;
}

module.exports = {
    startBirthdayScheduler,
};
