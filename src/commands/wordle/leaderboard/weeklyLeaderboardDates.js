const spacetime = require('spacetime');

function calculateWeeklyLeaderboardDates() {
  const now = spacetime.now('Australia/Melbourne');
  let day = (now.day() === 0) ? 7 : now.day()

  const dateFormat = '{iso-short} {hour-24-pad}:{minute-pad}'

  const prevSunday = now.subtract(day, 'days').add(1, 'days').time('12:00am');
  const nextSunday = prevSunday.add(6, 'days').time('11:59pm');

  const dates = [ prevSunday.goto('UTC').format(dateFormat), nextSunday.goto('UTC').format(dateFormat) ];

  console.log(dates);

  return dates;
}

module.exports = {
  calculateWeeklyLeaderboardDates
}