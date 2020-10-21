"use strict";

const spacetime = require("spacetime");
const birthdays = require("./components/birthdays");

// Use the Melbourne timezone for all operations
const melbTimezone = "Australia/Melbourne";

// Get the current time in Melbourne
const now = spacetime.now(melbTimezone);

// The time that the script should run
const runTime = "9:00am";

// Check whether the current time is the run time, to the nearest hour
const shouldRun = now.isSame(now.time(runTime), "hour");

if (shouldRun) {
  birthdays.sendWish(melbTimezone);
} else {
  console.log(`It's not the right time to run, the current time is ${now.time()}`);
}