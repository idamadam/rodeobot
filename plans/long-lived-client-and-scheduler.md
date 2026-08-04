# Archived plan: long-lived Discord client and scheduler

This plan was implemented in 2025 and later modernized for Node.js 24, Discord.js 14.27, and node-cron 4.6.

The current implementation and operational guidance are authoritative:

- `README.md` documents setup, configuration, execution, and deployment.
- `CLAUDE.md` documents repository conventions and runtime flow.
- `src/botClient.js` owns the singleton client and ready promise.
- `src/scheduler.js` owns the timezone-aware, non-overlapping cron task.
- `src/reminders/sendBirthdayMessages.js` owns the reminder delivery workflow.

The original ticket details were removed after completion because they described obsolete event names, scheduler options, and configuration fields.
