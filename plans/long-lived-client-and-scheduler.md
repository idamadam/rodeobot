# Ticket Set: Long-lived Discord Client & Scheduler

## Expert Review Q&A
- **Q:** How do we guarantee the client only logs in once and consumers wait for the `ready` event?  
  **A:** Cache both the `client` instance and a `readyPromise` in `botClient.js`. `initClient()` should immediately return the cached promise after the first call, and the module should resolve the ready promise using `client.once('ready')`. Expose helpers (e.g., `getReadyClient()`) so callers can await readiness before using the client.
- **Q:** When should the scheduler begin executing jobs?  
  **A:** Only start cron jobs after the ready promise resolves. This ensures the client has populated caches and prevents early channel fetch failures. If the client emits `shardDisconnect`/`reconnecting`, consider logging and letting the next cron run rely on Discord.js auto-reconnect.
- **Q:** How do we verify the fetched channel supports sending messages?  
  **A:** After `client.channels.fetch(channelId)`, assert `channel?.isTextBased()` (see `BaseChannel` docs). If not text-based or missing required permissions, log an error and skip sending for that run.
- **Q:** Should birthday data be reloaded each cron run or cached once?  
  **A:** Reload within the cron callback so updates to `FRIENDS_JSON` (or a file) take effect without restarting the bot. Wrap parsing in try/catch and log, skipping the run if data is invalid.

## Ticket 1: Shared Discord Client Bootstrap
- **Summary**: Create a reusable Discord client module that logs in once and exposes the ready client to the rest of the app.
- **Implementation Notes**:
  - Add `src/botClient.js` that loads env vars, instantiates `Client` with required intents, binds `ready`/error listeners, and caches the login promise so multiple callers reuse the same client. Library reference: [discord.js Client docs](https://discord.js.org/#/docs/discord.js/main/class/Client).
  - Extract any config validation (token, channel ID) into this module or a small helper.
  - Cache a `readyPromise` resolved from `client.once('ready')` and export `awaitReadyClient()` (or similar) so downstream code can safely await readiness.
  - Update `index.js` to use `initClient()` instead of constructing the client inline, awaiting readiness before scheduling.
- **Acceptance Criteria**:
  - Running `node index.js` logs the bot in exactly once.
  - Repeated imports of `initClient()` do not trigger additional logins.
  - `awaitReadyClient()` resolves after the `ready` event fires, and helpful logs appear on `ready` and on errors.

## Ticket 2: Refactor Birthday Reminder for Shared Client
- **Summary**: Move the birthday reminder workflow into its own module that operates on the shared client without logging in/out.
- **Implementation Notes**:
  - Create `src/reminders/sendBirthdayMessages.js` (or similar) that exports an async function expecting `{ client, birthdayService, channelId }`. See [discord.js ChannelManager#fetch](https://discord.js.org/#/docs/discord.js/main/class/ChannelManager?scrollTo=fetch) for channel lookup guidance.
  - Replace `client.channels.cache.get` with `await client.channels.fetch(channelId)` and handle missing channel scenarios gracefully.
  - Remove any `client.login()`/`client.destroy()` calls from the reminder flow; rely entirely on the injected client instance.
  - Confirm the fetched channel is text-capable via `channel.isTextBased()`, log permission issues, and skip sending when invalid.
  - Reload friend data per invocation so updates are reflected, wrapping parsing in try/catch with clear logs.
  - Add lightweight logging around message counts and errors.
- **Acceptance Criteria**:
  - The reminder module can be unit tested with a mocked client.
  - Channel fetch failures are logged and do not crash the process.
  - Friend data reload failures are logged and skip the run without throwing.
  - Birthday messages send successfully when the client is ready and the channel is text-capable.

## Ticket 3: Introduce Cron Scheduler
- **Summary**: Add a cron-based scheduler that triggers the birthday reminder on a configurable cadence while keeping the process alive.
- **Implementation Notes**:
  - Add `node-cron` dependency. Reference: [node-cron GitHub documentation](https://github.com/kelektiv/node-cron).
  - Create `src/scheduler.js` exposing `startBirthdayScheduler({ client, birthdayService, schedule, channelId })`.
  - Default schedule should be daily at 08:00 (`0 8 * * *`) and honor an env override (e.g., `BIRTHDAY_CRON_SCHEDULE`).
  - Use the birthday service timezone (e.g., `Australia/Melbourne`) in the cron options.
  - Await the shared client's `readyPromise` before scheduling, and ensure the cron callback awaits `sendBirthdayMessages`.
  - Wrap the cron callback in try/catch and log errors, including metadata (schedule, channelId, friend count).
- **Acceptance Criteria**:
  - Changing `BIRTHDAY_CRON_SCHEDULE` adjusts the run cadence without code changes.
  - Scheduler keeps the process running and triggers the reminder on schedule (manual test acceptable by using `*/1 * * * *`).
  - Scheduler only starts after the client is ready.
  - Errors inside the job are logged but do not crash the process.

## Ticket 4: Documentation & Verification
- **Summary**: Document the new workflow and ensure developers can test the scheduler locally.
- **Implementation Notes**:
  - Update README (or create a doc) with instructions on required env vars, running the bot, and adjusting the cron schedule.
  - Provide manual test steps (e.g., temporary minute-based cron) and mention how to verify Discord messages arrive, including waiting for the client ready log before expecting cron execution.
  - Note any limitations (JSON config source, need for uptime-friendly hosting) and call out that friend data is reloaded each run.
  - Document new helpers (`initClient`, `awaitReadyClient`, scheduler module) and link to the library docs cited above.
- **Acceptance Criteria**:
  - Documentation reflects the long-lived client architecture and scheduler usage.
  - Developers have clear steps to run locally and verify cron execution.
