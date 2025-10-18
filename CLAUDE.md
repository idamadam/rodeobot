# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RodeoBot is a Discord bot that sends birthday messages and reminders for friends. It runs as a scheduled job (via cron or similar) to check for birthdays daily and posts messages to a Discord channel.

## Architecture

### Core Components

- **index.js**: Entry point that loads friend data from environment variable, initializes Discord client, and coordinates the birthday checking and message sending flow
- **src/birthdayService.js**: Contains `BirthdayService` class that handles birthday logic - checks if today is anyone's birthday or if there's an upcoming birthday within the reminder window (default 14 days)
- **friends.json**: Sample data file (gitignored in production) - actual data is loaded from `FRIENDS_JSON` environment variable as JSON string

### Data Flow

1. `loadFriends()` in index.js parses the `FRIENDS_JSON` environment variable
2. `BirthdayService.getBirthdayMessages()` takes the friends array and returns an array of messages to send
3. Messages are sent to Discord channel specified by `GENERAL_CHANNEL_ID` environment variable
4. Bot exits after sending messages

### Environment Variables

Required environment variables:
- `DISCORD_BOT_TOKEN`: Discord bot authentication token
- `GENERAL_CHANNEL_ID`: Discord channel ID where messages are sent
- `FRIENDS_JSON`: JSON string containing array of friend objects with `discordUsername` and `birthday` fields

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
