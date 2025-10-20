# RodeoBot

A Discord bot that sends birthday messages and reminders for your friends. RodeoBot runs as a long-lived process with scheduled checks for upcoming birthdays.

## Features

- Sends birthday messages with GIFs on friends' birthdays
- Sends reminder messages for upcoming birthdays (default 14 days in advance)
- Runs on a configurable cron schedule
- Timezone-aware (default: Australia/Melbourne)
- Reloads friend data on each scheduled run (no restart needed for config changes)

## Architecture

RodeoBot uses a **long-lived Discord client** that connects once at startup and remains connected. A cron-based scheduler triggers birthday checks at configured intervals (default: daily at 08:00). The bot process remains running continuously, making it suitable for deployment on platforms that support long-running processes.

### Key Components

- **Discord Client Singleton** (`src/botClient.js`) - Manages a single Discord connection that's reused across all scheduled runs. See [discord.js Client docs](https://discord.js.org/#/docs/discord.js/main/class/Client).
- **Cron Scheduler** (`src/scheduler.js`) - Schedules birthday checks using [node-cron](https://github.com/kelektiv/node-cron).
- **Birthday Reminder** (`src/reminders/sendBirthdayMessages.js`) - Loads friend data, checks for birthdays, and sends messages. Uses [`client.channels.fetch()`](https://discord.js.org/#/docs/discord.js/main/class/ChannelManager?scrollTo=fetch) for channel lookup.
- **Birthday Service** (`src/birthdayService.js`) - Core birthday logic and message generation.

## Requirements

- Node.js (v16 or higher recommended)
- A Discord bot token (see [Discord Developer Portal](https://discord.com/developers/applications))
- A Discord channel ID where messages will be sent

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rodeobot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your configuration:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
GENERAL_CHANNEL_ID=your_channel_id_here
FRIENDS_JSON=[{"discordUsername":"@username","birthday":"January 15"},{"discordUsername":"@anotheruser","birthday":"March 22"}]
BIRTHDAY_CRON_SCHEDULE=0 8 * * *
```

## Environment Variables

### Required

- **`DISCORD_BOT_TOKEN`**: Your Discord bot authentication token. Get this from the [Discord Developer Portal](https://discord.com/developers/applications).
- **`GENERAL_CHANNEL_ID`**: The Discord channel ID where birthday messages will be sent. You can get this by enabling Developer Mode in Discord and right-clicking the channel.
- **`FRIENDS_JSON`**: A JSON string containing an array of friend objects. Each object should have:
  - `discordUsername`: Discord username with @ prefix (e.g., `"@johndoe"`)
  - `birthday`: Birthday in "Month Day" format (e.g., `"August 13"`)

### Optional

- **`BIRTHDAY_CRON_SCHEDULE`**: Cron schedule string for when to check birthdays. Defaults to `0 8 * * *` (daily at 08:00 in the configured timezone). See [Cron Syntax](#cron-syntax) below.

### Example FRIENDS_JSON

```json
[
  {
    "discordUsername": "@alice",
    "birthday": "January 15"
  },
  {
    "discordUsername": "@bob",
    "birthday": "March 22"
  },
  {
    "discordUsername": "@charlie",
    "birthday": "December 5"
  }
]
```

When setting as an environment variable, make sure to properly escape or quote the JSON string.

## Running the Bot

### Production

Start the bot with the default configuration:

```bash
npm start
```

The bot will:
1. Connect to Discord and log in
2. Wait for the "client ready" event
3. Start the cron scheduler
4. Remain running, checking for birthdays on the configured schedule

You should see output like:
```
Bot is ready! Logged in as RodeoBot#1234
Starting birthday scheduler with schedule: "0 8 * * *" (timezone: Australia/Melbourne)
Channel ID: 123456789012345678
Discord client is ready, scheduling birthday reminders
Birthday scheduler started successfully
RodeoBot is running. Press Ctrl+C to exit.
```

### Development / Local Testing

For local testing, you may want to use a more frequent schedule to verify the bot works without waiting for the daily trigger.

#### Quick Test (Every Minute)

1. Update your `.env` file to use a minute-based schedule:
```env
BIRTHDAY_CRON_SCHEDULE=*/1 * * * *
```

2. Temporarily update a friend's birthday in `FRIENDS_JSON` to today's date or an upcoming date within 14 days.

3. Start the bot:
```bash
npm start
```

4. Wait for the "client ready" log message - this indicates the scheduler is now active.

5. Within 1 minute, you should see:
```
Running scheduled birthday reminder check...
Loaded 3 friend(s) from FRIENDS_JSON
Found 1 message(s) to send
Successfully sent 1 message(s) to channel 123456789012345678
```

6. Check your Discord channel to verify the message arrived.

7. **Important**: Remember to revert `BIRTHDAY_CRON_SCHEDULE` back to the production schedule before deploying.

#### Test Without Waiting (Immediate Execution)

For one-time testing without waiting for cron, you can temporarily modify `index.js` to call `sendBirthdayMessages` directly after getting the ready client, but this is not recommended for production use.

## Cron Syntax

The `BIRTHDAY_CRON_SCHEDULE` uses standard cron syntax:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 both represent Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples

- `0 8 * * *` - Daily at 08:00 (default)
- `0 9 * * *` - Daily at 09:00
- `0 8 * * 1` - Every Monday at 08:00
- `*/5 * * * *` - Every 5 minutes
- `*/1 * * * *` - Every minute (for testing only!)
- `0 8,20 * * *` - Twice daily at 08:00 and 20:00

See the [node-cron documentation](https://github.com/kelektiv/node-cron) for more details.

## Verifying the Bot Works

### 1. Check for "Client Ready" Log

When the bot starts, you must see this log message:
```
Bot is ready! Logged in as RodeoBot#1234
```

If you don't see this, the scheduler will not execute. Common issues:
- Invalid `DISCORD_BOT_TOKEN`
- Network connectivity problems
- Bot doesn't have access to any guilds

### 2. Wait for Scheduled Execution

After the "client ready" log, the scheduler starts. You'll see:
```
Discord client is ready, scheduling birthday reminders
Birthday scheduler started successfully
```

The cron job will execute at the scheduled time. When it runs, you'll see:
```
Running scheduled birthday reminder check...
```

### 3. Verify Messages in Discord

- If there are birthdays today or upcoming within 14 days, messages will appear in the configured channel
- If there are no birthdays, you'll see: `No birthday messages to send today.`
- Check that the bot has permissions to send messages in the target channel

### 4. Common Issues

**Messages not sending:**
- Verify the bot has "Send Messages" permission in the channel
- Check that `GENERAL_CHANNEL_ID` is correct
- Ensure the channel is a text channel (not voice, forum, etc.)

**Scheduler not running:**
- Ensure you waited for the "client ready" log before expecting cron execution
- Verify the cron schedule is valid
- Check timezone alignment - the schedule runs in the birthday service timezone (Australia/Melbourne by default)

**Friend data not loading:**
- Check that `FRIENDS_JSON` is valid JSON
- Verify birthday format is "Month Day" (e.g., "August 13")
- Friend data is reloaded on each scheduled run, so you can update the env var and wait for the next run

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests are located in `src/__tests__/` and use Jest. The test suite mocks `spacetime.now()` to control the current date for deterministic testing.

## Deployment Considerations

### Hosting Requirements

RodeoBot requires a hosting platform that supports **long-running processes** (not serverless functions). Suitable options include:

- VPS or dedicated server
- Cloud compute instances (AWS EC2, Google Compute Engine, etc.)
- Container platforms (Docker, Kubernetes)
- Platform-as-a-Service with persistent processes (Heroku, Railway, Render, etc.)

**Do not deploy to serverless platforms** like AWS Lambda or Vercel Functions, as they are designed for short-lived requests, not long-running processes.

### Process Management

Consider using a process manager to ensure the bot restarts on crashes:

- **PM2** (recommended): `pm2 start index.js --name rodeobot`
- **systemd**: Create a service unit file
- **Docker**: Use restart policies (`--restart unless-stopped`)

### Monitoring

The bot logs all significant events to stdout:
- Client ready status
- Scheduled run execution
- Messages sent
- Errors and failures

Capture these logs using your hosting platform's logging solution for monitoring and debugging.

## Limitations

### Current Limitations

1. **JSON Configuration Source**: Friend data is loaded from an environment variable. For larger datasets or frequent updates, consider migrating to a database or external config service.

2. **No Persistence**: The bot doesn't track which messages have been sent. If the process restarts multiple times on the same day, it may send duplicate birthday messages. Consider adding a simple persistence layer if this is a concern.

3. **Requires Uptime**: The bot must remain running continuously to execute scheduled checks. Downtime means missed birthday checks.

4. **Single Channel**: Messages are sent to a single channel. To support multiple channels, you would need to extend the configuration and scheduler logic.

5. **Timezone**: The birthday service uses a single timezone (Australia/Melbourne by default). Friends in other timezones may receive messages at unexpected times.

### Future Enhancements

Potential improvements include:
- Database-backed friend storage
- Sent message tracking to prevent duplicates
- Multi-channel support
- Per-friend timezone configuration
- Web interface for managing friends
- Slash commands for manual birthday checks

## Contributing

Please see `CLAUDE.md` for detailed architecture documentation and development guidelines.

## License

ISC
