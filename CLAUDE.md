# Repository guidance

RodeoBot is an ECMAScript-module Cloudflare Worker with two entry points. Two UTC Cron Triggers post birthday announcements and 14-day reminders through a Discord incoming webhook. An Email Routing `email` handler turns forwarded Letterloop newsletter issues into a Discord forum post through a second webhook. There is no HTTP route, persistent process, Discord.js client, slash-command workflow, database, or runtime dependency.

## Runtime flow

1. Cloudflare calls `src/worker.js` at 21:00 and 22:00 UTC.
2. The Worker converts `controller.scheduledTime` to `Australia/Melbourne`; only the invocation at 08:00 local continues.
3. `src/config.js` validates the two required secret bindings and canonical friend records.
4. `src/birthdayService.js` calculates today's birthdays and dates exactly 14 calendar days away.
5. `src/webhook.js` combines all blocks into one raw Discord webhook request with restricted mentions.
6. Successful and no-op events call `controller.noRetry()`. Failures are logged without secret values and rethrown.

## Newsletter flow

1. Gmail forwards Letterloop issue emails to a hard-to-guess Email Routing address on `critter.sh`. Never enable Email Routing on `idamadam.com`: its MX records belong to iCloud.
2. `src/worker.js` `email()` reads the raw message; `src/mime.js` decodes it without dependencies.
3. `src/newsletterService.js` ignores anything not from `hello@letterloop.co` with an `Issue No.` subject, logging the sender and subject, plus the code from Gmail forwarding confirmations.
4. `src/letterloop.js` parses the issue HTML. Photo attribution relies on `#<memberId>-<sectionKey>` link fragments; the photo wall renders photos before captions, every other section renders the author first.
5. `src/newsletterMessages.js` builds one forum post (`thread_name`), then Components V2 messages per question/section, and one per photo-wall post (text, media galleries under each answer, track sections), within Discord's 40-component and 4,000-character limits. `src/webhook.js` adds `with_components=true` for these.
6. Failures before the first post are rethrown; after a post exists they are logged only, to avoid duplicate forum posts on redelivery.

Letterloop links carry the recipient's `member` ID, which acts as a personal access token. Never post it; `sanitizeIssueUrl` strips it. Test fixtures are synthetic; never commit real issue content.

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

- Required secrets: `DISCORD_WEBHOOK_URL`, `FRIENDS_JSON`, and `LETTERLOOP_WEBHOOK_URL` (a forum channel webhook; the email handler loads only this one).
- `FRIENDS_JSON` is an array of canonical `{ "discordUserId", "birthday" }` records.
- Discord user IDs are numeric 17–20 digit snowflakes.
- Birthdays use full `Month Day` strings.
- Delivery is fixed at 08:00 in `Australia/Melbourne`, with a 14-day reminder.
- The webhook payload allows only the explicitly configured user mentions; newsletter payloads allow none.
- Secrets must never appear in tracked configuration, logs, or error messages.
