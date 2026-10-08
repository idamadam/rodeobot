# RodeoBot

RodeoBot is a scheduled [Cloudflare Worker](https://developers.cloudflare.com/workers/) that posts birthday announcements and 14-day reminders to one Discord channel through an incoming webhook. It also receives forwarded [Letterloop](https://letterloop.co/) newsletter issues by email and posts each one to a Discord forum channel for discussion (see [Letterloop newsletter posts](#letterloop-newsletter-posts)).

It has no persistent process, Discord Gateway connection, bot token, slash commands, database, or runtime dependencies. Cloudflare invokes it twice per UTC day; a Melbourne-time guard ensures exactly one invocation performs the 08:00 check across daylight-saving changes.

## Requirements

- Node.js 24 from the version in [`.nvmrc`](./.nvmrc)
- A Cloudflare account
- Permission to create a webhook in the destination Discord channel

Install the locked development dependency:

```bash
npm ci
```

## Discord webhook

Open the destination channel's settings, select **Integrations**, create a webhook, and copy its URL. The URL grants permission to post to that channel, so treat it like a password and revoke it in Discord if it is ever exposed.

The old Discord application, bot token, channel ID, and slash-command registration are not used.

## Configuration

Copy the local secret template:

```bash
cp .dev.vars.example .dev.vars
```

Set both values in `.dev.vars`:

- `DISCORD_WEBHOOK_URL`: the incoming webhook URL copied from Discord
- `FRIENDS_JSON`: a JSON array of `{ "discordUserId", "birthday" }` records

```dotenv
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/223456789012345678/secret-token"
FRIENDS_JSON='[{"discordUserId":"123456789012345678","birthday":"January 15"}]'
```

Friend IDs must be 17–20 digit Discord user IDs. Enable Discord Developer Mode, right-click a user, and select **Copy User ID**. Birthdays use the full `Month Day` format; February 29 is supported. The removed `discordUsername` compatibility field is no longer accepted.

`.dev.vars` is ignored by Git. Do not put either secret in `wrangler.jsonc` or commit it elsewhere.

## Local development

Run the Worker locally:

```bash
npm run dev
```

Wrangler exposes a local scheduled-event endpoint. This example simulates 08:00 Melbourne on 13 August 2026, matching the template birthday:

```bash
curl "http://localhost:8787/cdn-cgi/local/scheduled?time=1786572000000&format=json"
```

That request sends a real message to the webhook in `.dev.vars`. Use a disposable test webhook if the production channel should remain quiet. The other daily UTC trigger logs a skip and never loads secrets or calls Discord.

Run the offline checks with:

```bash
npm test
npm run test:coverage
npm run validate:config
npm audit
npm run deploy:dry-run
```

## Deployment

Authenticate Wrangler once:

```bash
npm exec wrangler login
```

For the initial deployment, populate `friends.csv` as described below and set
`DISCORD_WEBHOOK_URL` in `.dev.vars`. Stop the old long-running RodeoBot before
activating this schedule so both implementations cannot announce the same birthday.
Deploy the code and both secrets together:

```bash
npm run deploy:configured
```

The Worker has no public route. Its only production entry points are these UTC Cron Triggers:

- `0 21 * * *` — 08:00 during Australian Eastern Daylight Time
- `0 22 * * *` — 08:00 during Australian Eastern Standard Time

The same handler receives both. It returns without loading configuration unless the scheduled time is 08:00 in `Australia/Melbourne`. Cron changes can take several minutes to propagate.

After the next scheduled execution, confirm delivery and inspect **Workers & Pages → RodeoBot → Logs** in Cloudflare. If deployment fails before cutover is verified, restart the old process. Once verified, remove its bot token and other obsolete host variables. Deleting the old Discord application is an optional manual cleanup.

### Updating friends using a local CSV

Maintain birthdays in `friends.csv` in this project directory. It is ignored by
Git and stays on your machine. For a new checkout, copy `friends.example.csv` to
`friends.csv`, then replace the example rows with real people:

```csv
name,discordUserId,birthday
Alex,123456789012345678,January 15
Sam,234567890123456789,March 22
```

Names are labels for your convenience and are not uploaded. Use full month names;
February 29 is supported. Discord IDs must remain text: spreadsheet applications
can round these long numbers, so format that column as text before editing.
Quoted CSV fields (including names containing commas) are supported.

After saving the file:

```bash
npm run friends:validate
npm run friends:upload
```

The upload command validates every record and rejects duplicate IDs before
passing the converted data directly to Wrangler over stdin. No generated JSON
file is needed. It replaces the entire `FRIENDS_JSON` secret, preserving the
separate `DISCORD_WEBHOOK_URL` secret. An empty file with only the header requires
`npm run friends:upload -- --allow-empty` to intentionally clear the list.

You must be logged in with `npm exec wrangler login`. Uploading a secret creates
and deploys a Worker version; stop the old Railway bot before the first production
upload/deployment to avoid duplicate announcements. This command updates birthday
data, not application code; use `npm run deploy` for code changes. Local edits do
not affect production until uploaded. The local `.dev.vars` JSON used by Wrangler
development is not updated by this command.

For initial setup without manually writing JSON, put `DISCORD_WEBHOOK_URL` in
the Git-ignored `.dev.vars` file, fill in `friends.csv`, then run:

```bash
npm run deploy:configured
```

This deploys the code and both secrets together, which is required when the
Worker does not yet exist. It uses a temporary file readable only by your user,
then deletes it when Wrangler exits. Later birthday-only changes use
`npm run friends:upload`.

Keep a private backup of `friends.csv`; Git will not back it up for you.

## Delivery behavior

- Birthday and reminder blocks due on the same day are combined into one Discord message.
- Only configured user IDs may be mentioned; role and everyone mentions are disabled.
- An empty day makes no Discord request.
- Discord/network failures fail the invocation so Cloudflare can report or retry it. Successful and no-op runs disable retries.
- There is intentionally no KV deduplication. One request minimizes partial delivery, but an accepted request whose response is lost can very rarely be delivered twice.
- The combined message must remain within Discord's 2,000-character and 100-user mention limits; exceeding either fails visibly instead of silently dropping content.

## Letterloop newsletter posts

When a Letterloop issue such as "👋 The Pig Pen: Issue No.2" arrives, the Worker's `email` handler creates a new post in a Discord forum channel:

- The opening message lists the contributors, a link to the issue, and the next issue date.
- Each question gets its own message, with every answer and each person's photos as a gallery under their answer.
- Each photo-wall post gets its own message, so people can reply to a specific set of photos.
- Music, Check It Out, One Good Thing, and any other sections get one message each. Songs show album art with search links for Spotify, Apple Music, and YouTube Music.

Mentions are disabled, so text like `@everyone` never pings anyone. Letterloop's links include your personal member ID, which can act as a login token, so the Worker strips it and posts only the plain issue link.

### Setup

1. **Discord forum channel.** Create a forum channel, open **Edit Channel → Integrations → Webhooks**, create a webhook, and copy its URL. Keep it separate from the birthday webhook.
2. **Secret and deployment.**

   ```bash
   npm exec wrangler secret put LETTERLOOP_WEBHOOK_URL
   npm run deploy
   ```

3. **Email address.** Email Routing runs on `critter.sh`, which has no other mail. Do not enable it on `idamadam.com`: that domain's MX records belong to iCloud, and enabling routing would replace them. Route a hard-to-guess address to the Worker; Letterloop's DMARC policy is `p=none`, so the address is the main guard against spoofed issues.

   ```bash
   npx wrangler email routing enable critter.sh
   npx wrangler email routing rules create critter.sh --name "Letterloop to Discord" --match-type literal --match-field to --match-value pigpen-<random>@critter.sh --action-type worker --action-value rodeobot
   ```

4. **Gmail forwarding.** Start a log stream so you can read Gmail's confirmation code:

   ```bash
   npm exec wrangler tail
   ```

   In Gmail, open **Settings → Forwarding and POP/IMAP → Add a forwarding address** and enter the routing address. Gmail's confirmation email reaches the Worker, which ignores it but logs `Gmail forwarding confirmation code: …`. Enter that code in Gmail. You do not need to turn on forwarding for all mail.
5. **Gmail filter.** Create a filter with `from:hello@letterloop.co subject:"The Pig Pen: Issue"` and choose **Forward it to** the routing address. Only issues should match. Comment notifications, question prompts, and Letterloop's own "In The Loop" newsletter should not.

### Trying it locally

In Gmail, open an issue and use **⋮ → Download message** to save the `.eml` file. Put a disposable test forum webhook in `.dev.vars` as `LETTERLOOP_WEBHOOK_URL`, then run `npm run dev` and post the file to Wrangler's local email endpoint:

```bash
curl -X POST "http://localhost:8787/cdn-cgi/handler/email?from=you@gmail.com&to=pigpen@critter.sh" --data-binary @issue.eml
```

### Delivery notes

- Anything that is not from `hello@letterloop.co` with an `Issue No.` subject is logged and dropped.
- If delivery fails before anything is posted, the handler throws, so the send can be retried. Once the forum post exists, later failures are logged only, because a retry would create a duplicate post.
- Discord rate limits are handled by waiting the time Discord requests (up to 90 seconds per wait) and retrying.
- The parser depends on Letterloop's current email layout. If Letterloop changes its template, delivery fails with `Email did not match the expected Letterloop issue layout.` in the Worker logs.

## Architecture

- [`src/worker.js`](./src/worker.js): scheduled entry point, daylight-saving guard, orchestration, and safe logging
- [`src/config.js`](./src/config.js): secret, webhook URL, Discord ID, and birthday validation
- [`src/birthdayService.js`](./src/birthdayService.js): dependency-free Melbourne calendar and reminder logic
- [`src/webhook.js`](./src/webhook.js): raw Discord payload construction and delivery, thread targeting, and rate-limit retries
- [`src/mime.js`](./src/mime.js): dependency-free MIME decoding for inbound email
- [`src/letterloop.js`](./src/letterloop.js): Letterloop issue HTML parsing and photo attribution
- [`src/newsletterMessages.js`](./src/newsletterMessages.js): Discord forum-post and message construction for an issue
- [`src/newsletterService.js`](./src/newsletterService.js): email filtering and newsletter delivery orchestration

CI runs the Node test suite with 85% coverage thresholds, audits the dependency tree, and validates the Worker bundle with a Wrangler deployment dry run.

## License

ISC
