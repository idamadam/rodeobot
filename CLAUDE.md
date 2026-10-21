# Repository guidance

RodeoBot is an ECMAScript-module Cloudflare Worker running on two UTC Cron Triggers. It posts birthday announcements and 14-day reminders through a Discord incoming webhook. There is no HTTP route, persistent process, Discord.js client, slash-command workflow, database, or runtime dependency.

## Runtime flow

1. Cloudflare calls `src/worker.js` at 21:00 and 22:00 UTC.
2. The Worker converts `controller.scheduledTime` to `Australia/Melbourne`; only the invocation at 08:00 local continues.
3. `src/config.js` validates the two required secret bindings and canonical friend records.
4. `src/birthdayService.js` calculates today's birthdays and dates exactly 14 calendar days away.
5. `src/webhook.js` combines all blocks into one raw Discord webhook request with restricted mentions.
6. Successful and no-op events call `controller.noRetry()`. Failures are logged without secret values and rethrown.

## Archived features

The Letterloop newsletter email handler lives only at the `archive/letterloop` tag. If it is restored, never enable Email Routing on `idamadam.com`: its MX records belong to iCloud.

## Commands

```bash
npm ci
npm test
npm run test:watch
npm run test:coverage
npm run validate:config
npm audit
npm run deploy:dry-run
npm run dev
npm run deploy
```

## Testing conventions

Tests use `node:test` and `node:assert/strict`. Keep date calculation and payload construction pure, and inject `fetch` and loggers for deterministic offline tests. Always cover AEST and AEDT trigger behavior, year rollover, and leap-day changes.

## Configuration invariants

- Required secrets: `DISCORD_WEBHOOK_URL` and `FRIENDS_JSON`.
- `FRIENDS_JSON` is an array of canonical `{ "discordUserId", "birthday" }` records.
- Discord user IDs are numeric 17–20 digit snowflakes.
- Birthdays use full `Month Day` strings.
- Delivery is fixed at 08:00 in `Australia/Melbourne`, with a 14-day reminder.
- The webhook payload allows only the explicitly configured user mentions.
- Secrets must never appear in tracked configuration, logs, or error messages.
