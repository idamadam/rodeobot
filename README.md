# RodeoBot

RodeoBot is a small Discord bot that posts birthday announcements and advance reminders, plus an intentionally unhinged `/compliment` command.

It runs as one long-lived Node.js process. Discord.js maintains the Gateway connection while node-cron triggers the daily birthday check in the configured timezone.

## Requirements

- Node.js 24.17 or newer from the Node 24 LTS line
- A Discord application and bot token
- A Discord channel where the bot can view and send messages
- The bot's `Guilds` Gateway intent (no privileged intents are required)

## Setup

Install the locked dependencies:

```bash
npm ci
```

Copy the example configuration and replace its placeholders:

```bash
cp .env.example .env
```

The start and command-deployment scripts use Node's built-in `.env` file support. Environment variables supplied by the host take precedence over values in `.env`.

### Configuration

Required when running the bot:

- `DISCORD_BOT_TOKEN`: bot token from the Discord Developer Portal
- `GENERAL_CHANNEL_ID`: numeric ID of the destination channel
- `FRIENDS_JSON`: JSON array of `{ "discordUserId", "birthday" }` records

Optional:

- `BIRTHDAY_CRON_SCHEDULE`: defaults to `0 8 * * *`, or 08:00 daily

Required only when deploying slash commands:

- `CLIENT_ID`: Discord application ID
- `GUILD_ID`: development or production guild ID

Friend records use numeric Discord user IDs—not usernames or `@handles`—because Discord mentions are encoded using snowflake IDs. Enable Developer Mode in Discord, right-click a user or channel, and select **Copy ID**.

```json
[
  {
    "discordUserId": "123456789012345678",
    "birthday": "January 15"
  },
  {
    "discordUserId": "223456789012345678",
    "birthday": "December 5"
  }
]
```

Birthdays must use the full `Month Day` format. The legacy `discordUsername` field remains accepted when it contains a numeric user ID, but logs a migration warning.

Configuration is validated before Discord login. Friend data is parsed again during each scheduled check, though changing a host environment variable or `.env` file still requires restarting the process.

## Running

Register the guild slash commands after changing command definitions:

```bash
npm run deploy-commands
```

Start the long-lived bot process:

```bash
npm start
```

Command deployment is intentionally separate from startup, avoiding an unnecessary Discord API write on every restart.

For a one-minute local scheduler test, temporarily set:

```env
BIRTHDAY_CRON_SCHEDULE=*/1 * * * *
```

Set one configured birthday to today, start the bot, and wait for the scheduled-check log. Restore the production schedule afterwards.

## Architecture

- [`index.js`](./index.js): validates configuration, loads commands, connects the client, starts the scheduler, and handles graceful shutdown
- [`src/botClient.js`](./src/botClient.js): owns the singleton Discord.js client and its ready promise
- [`src/config.js`](./src/config.js): validates environment variables and normalizes friend records
- [`src/scheduler.js`](./src/scheduler.js): creates the timezone-aware, non-overlapping cron task
- [`src/reminders/sendBirthdayMessages.js`](./src/reminders/sendBirthdayMessages.js): fetches the destination channel and sends generated messages
- [`src/birthdayService.js`](./src/birthdayService.js): contains timezone-aware birthday and reminder-date logic
- [`src/loadCommands.js`](./src/loadCommands.js): discovers and validates slash-command modules

The process handles `SIGINT` and `SIGTERM` by destroying the scheduled task and Discord client. Individual scheduled-run and message-send failures are logged without crashing later runs.

## Development

Run the Node.js test suite:

```bash
npm test
```

Other useful commands:

```bash
npm run test:watch
npm run test:coverage
npm audit
```

Tests use the Node 24 built-in test runner, so the repository has no development-only test framework dependency tree. CI runs a clean install, the complete test suite, and a production dependency audit.

## Deployment notes

RodeoBot needs a host suitable for a long-running process, such as a VPS, container service, or persistent PaaS worker. Use the Node 24 LTS runtime and configure the host to restart the process after failures.

Current limitations:

- Messages are sent to one channel in one timezone.
- Friend configuration is stored in one environment variable.
- Sent announcements are not persisted, so restarting and manually retriggering a check can produce duplicates.
- Downtime during the scheduled minute can cause a missed check.

## License

ISC
