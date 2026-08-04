# Repository guidance

RodeoBot is a CommonJS Node.js 24 application using Discord.js 14, node-cron 4, and spacetime 7.

## Runtime flow

1. `index.js` constructs `BirthdayService` and validates runtime configuration.
2. `src/loadCommands.js` loads command modules from `src/commands`.
3. `src/botClient.js` creates one Discord client with only the `Guilds` intent and resolves after `Events.ClientReady`.
4. `src/scheduler.js` creates a timezone-aware cron task with overlap prevention.
5. Each scheduled callback asks `src/reminders/sendBirthdayMessages.js` to validate friend data, generate messages, fetch a sendable channel, and send each message independently.

Slash-command registration is an explicit deployment operation and must not be added back to normal startup.

## Commands

```bash
npm ci
npm test
npm run test:watch
npm run test:coverage
npm run deploy-commands
npm start
```

Both executable scripts load `.env` through Node's `--env-file-if-exists` option. Production hosts may provide environment variables directly.

## Testing conventions

Tests use `node:test` and `node:assert/strict`. Prefer constructor or function dependency injection over module-loader mocks. Keep external Discord and scheduler calls behind small injected interfaces so unit tests remain offline and deterministic.

Birthday tests inject a `nowProvider` into `BirthdayService`. Always add regression coverage for timezone boundaries, year rollover, or leap-day changes.

## Configuration invariants

- Discord channel, user, client, and guild identifiers are numeric snowflakes.
- Friend birthdays use full `Month Day` strings.
- `discordUserId` is the canonical friend field. `discordUsername` is compatibility-only and must contain a numeric ID.
- Default schedule: `0 8 * * *` in `Australia/Melbourne`.
- The production bot does not require `MessageContent` or any other privileged Gateway intent.
