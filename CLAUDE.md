# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RodeoBot is a Discord bot that sends birthday messages and reminders for friends. It runs as a scheduled job (via cron or similar) to check for birthdays daily and posts messages to a Discord channel.

## Architecture

RodeoBot uses a **long-lived Discord client** architecture with a **cron-based scheduler**. The bot connects to Discord once at startup and remains connected, running scheduled birthday checks at configured intervals. Friend data is reloaded on each scheduled run to pick up configuration changes without requiring a restart.

### Core Components

- **index.js**: Entry point that initializes the Discord client, loads slash commands, handles interactions, creates the birthday service, and starts the scheduler. The process remains running to handle scheduled birthday checks and slash command interactions.
- **src/botClient.js**: Singleton Discord client manager. Handles client initialization, login, and ready state management. Exports `initClient()` and `getReadyClient()` helpers to ensure the client is logged in exactly once and ready before use. See [discord.js Client docs](https://discord.js.org/#/docs/discord.js/main/class/Client).
- **src/scheduler.js**: Cron-based scheduler module using [node-cron](https://github.com/kelektiv/node-cron). Exports `startBirthdayScheduler()` which sets up a recurring job to check and send birthday messages. Defaults to daily at 08:00 in the configured timezone.
- **src/reminders/sendBirthdayMessages.js**: Birthday reminder workflow module. Loads friend data, checks for birthdays, fetches the Discord channel using [`client.channels.fetch()`](https://discord.js.org/#/docs/discord.js/main/class/ChannelManager?scrollTo=fetch), validates the channel is text-based, and sends messages. Includes comprehensive error handling to prevent crashes on individual runs.
- **src/birthdayService.js**: Contains `BirthdayService` class that handles birthday logic - checks if today is anyone's birthday or if there's an upcoming birthday within the reminder window (default 14 days)
- **src/commands/**: Directory containing slash command modules. Each command exports `data` (SlashCommandBuilder) and `execute` (handler function) properties.
  - **src/commands/ask.js**: AI-powered `/ask` command that queries Claude with configurable Discord channel context. Uses Vercel AI SDK and Anthropic provider.
  - **src/commands/compliment.js**: `/compliment` command that sends unhinged compliments
- **src/utils/messageContext.js**: Utilities for fetching and formatting Discord messages for AI context. Provides token-efficient message formatting and smart context strategies (recent, conversational, extended).
- **src/deploy-commands.js**: Script to register slash commands with Discord's API. Auto-runs on bot startup if `CLIENT_ID` and `GUILD_ID` are configured.
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

Optional environment variables:
- `BIRTHDAY_CRON_SCHEDULE`: Cron schedule string (defaults to `0 8 * * *` - daily at 08:00)
- `ANTHROPIC_API_KEY`: Anthropic API key for AI-powered `/ask` command
- `CLIENT_ID`: Discord application client ID (required for slash commands)
- `GUILD_ID`: Discord guild/server ID (required for slash commands)

### Birthday Logic

The `BirthdayService` class (src/birthdayService.js:3):
- Uses `spacetime` library for timezone-aware date handling (default: Australia/Melbourne)
- Checks for exact birthday matches (sends celebratory message with GIF)
- Checks for birthdays in N days (default 14) and sends reminder messages
- Birthday format in JSON: "Month Day" (e.g., "August 13")

### Slash Commands

RodeoBot supports Discord slash commands for interactive features:

#### Command Structure
All commands follow the pattern:
- Export object with `data` (SlashCommandBuilder) and `execute` (async function) properties
- Commands are automatically loaded from `src/commands/` directory on bot startup
- Commands are auto-deployed if `CLIENT_ID` and `GUILD_ID` are configured

#### `/ask` Command (src/commands/ask.js:12)
AI-powered question answering with configurable conversation context:
- **Technology**: Uses Vercel AI SDK with Anthropic provider (`claude-3-5-sonnet-20241022`)
- **Context Strategies**: none, recent (1 hour), conversation (current topic), extended (50 messages)
- **Token Optimization**: Uses `messageContext.js` utilities to format messages efficiently
  - Extracts only: username, content, timestamp
  - Filters out: metadata, embeds, reactions, full User objects
  - 10-20x more token-efficient than raw Message objects
- **Error Handling**: Validates API key, handles rate limits, truncates long responses (2000 char Discord limit)

#### Message Context Utilities (src/utils/messageContext.js)
Helper functions for fetching and formatting Discord messages:
- `timestampToSnowflake(date)`: Converts JS Date to Discord Snowflake for time-based queries
- `fetchMessagesSince(channel, hours)`: Fetches messages from last N hours using Snowflake filtering
- `formatMessagesEfficiently(messages, options)`: Converts Message Collection to token-efficient string
- `getRecentContext(channel, hours)`: Last N hours of messages
- `getConversationalContext(channel, maxMessages, topicBreakMinutes)`: Smart context that stops at conversation gaps (default 30min)
- `getExtendedContext(channel, limit)`: Fixed number of recent messages

**Key Design Decision**: Discord's `messages.fetch()` uses Snowflake IDs (not timestamps) for filtering. The `before`/`after`/`around` parameters take message IDs. Snowflakes encode timestamps, so we convert dates to Snowflakes for time-based queries.

## Development Commands

### Run the bot
```bash
npm start
```

### Deploy slash commands
```bash
npm run deploy-commands
```
Note: Commands are auto-deployed on bot startup if `CLIENT_ID` and `GUILD_ID` are configured.

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
