# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RodeoBot is a Discord bot that sends birthday messages and reminders for friends. It runs as a scheduled job (via cron or similar) to check for birthdays daily and posts messages to a Discord channel.

## Architecture

RodeoBot uses a **long-lived Discord client** architecture with a **cron-based scheduler**. The bot connects to Discord once at startup and remains connected, running scheduled birthday checks at configured intervals. Friend data is reloaded on each scheduled run to pick up configuration changes without requiring a restart.

### Core Components

- **index.js**: Entry point that initializes the Discord client, creates the birthday service, and starts the scheduler. The process remains running to handle scheduled birthday checks.
- **src/botClient.js**: Singleton Discord client manager. Handles client initialization, login, and ready state management. Exports `initClient()` and `getReadyClient()` helpers to ensure the client is logged in exactly once and ready before use. See [discord.js Client docs](https://discord.js.org/#/docs/discord.js/main/class/Client).
- **src/scheduler.js**: Cron-based scheduler module using [node-cron](https://github.com/kelektiv/node-cron). Exports `startBirthdayScheduler()` which sets up a recurring job to check and send birthday messages. Defaults to daily at 08:00 in the configured timezone.
- **src/reminders/sendBirthdayMessages.js**: Birthday reminder workflow module. Loads friend data, checks for birthdays, fetches the Discord channel using [`client.channels.fetch()`](https://discord.js.org/#/docs/discord.js/main/class/ChannelManager?scrollTo=fetch), validates the channel is text-based, and sends messages. Includes comprehensive error handling to prevent crashes on individual runs.
- **src/birthdayService.js**: Contains `BirthdayService` class that handles birthday logic - checks if today is anyone's birthday or if there's an upcoming birthday within the reminder window (default 14 days)
- **friends.json**: Sample data file (gitignored in production) - actual data is loaded from `FRIENDS_JSON` environment variable as JSON string

### Data Flow

1. `index.js` calls `initClient()` to initialize the Discord client singleton
2. Awaits `getReadyClient()` to ensure the client is fully ready before proceeding
3. Creates a `BirthdayService` instance and calls `startBirthdayScheduler()`
4. Scheduler waits for the client ready state, then schedules a cron job
5. On each scheduled run:
   - `sendBirthdayMessages()` reloads friend data from `FRIENDS_JSON` environment variable
   - `BirthdayService.getBirthdayMessages()` checks for birthdays and returns messages to send
   - Channel is fetched via `client.channels.fetch()` and validated as text-based
   - Messages are sent to the Discord channel specified by `GENERAL_CHANNEL_ID`
6. Process remains running, executing birthday checks on the configured schedule

### Environment Variables

Required environment variables:
- `DISCORD_BOT_TOKEN`: Discord bot authentication token
- `GENERAL_CHANNEL_ID`: Discord channel ID where messages are sent
- `FRIENDS_JSON`: JSON string containing array of friend objects with `discordUsername` and `birthday` fields
- `BIRTHDAY_CRON_SCHEDULE` (optional): Cron schedule string (defaults to `0 8 * * *` - daily at 08:00)

### Birthday Logic

The `BirthdayService` class (src/birthdayService.js:3):
- Uses `spacetime` library for timezone-aware date handling (default: Australia/Melbourne)
- Checks for exact birthday matches (sends celebratory message with GIF)
- Checks for birthdays in N days (default 14) and sends reminder messages
- Birthday format in JSON: "Month Day" (e.g., "August 13")

## Development Commands

### Run the bot
```bash
npm start
```

### Run tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Testing

Tests are located in `src/__tests__/` and use Jest. The test suite mocks `spacetime.now()` to control the current date for deterministic testing of birthday logic.

When writing tests:
- Mock `spacetime.now()` to set a specific test date
- Use the existing mock pattern in birthdayService.test.js:5-10
- Test both exact birthday matches and reminder window matches
