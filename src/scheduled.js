"use strict";

const spacetime = require('spacetime');
const friends = require("../friends.json");

function main() {
    // Use the Melbourne timezone for all operations
    const melbTimezone = 'Australia/Melbourne';

    // Get the current time in Melbourne
    const now = spacetime.now(melbTimezone);

    // The time that the script should run
    const runTime = "8:00pm"

    // Check whether the current time is the run time, to the nearest hour
    const shouldRun = now.isSame(now.time(runTime), 'hour')

    if (shouldRun) {
        const birthdayPeeps = friends.filter(friend => { 
            let birthday = spacetime(friend.birthday, melbTimezone);

            return now.isSame(birthday, 'day');
        })

        console.log(birthdayPeeps);
    }
}

main();
