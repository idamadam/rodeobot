const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const BIRTHDAY_PATTERN = new RegExp(
  `^(${MONTH_NAMES.join("|")}) ([1-9]|[12]\\d|3[01])$`,
);

export const BIRTHDAY_GIF_URL =
  "https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif";
export const DEFAULT_REMINDER_DAYS = 14;
export const TIMEZONE = "Australia/Melbourne";

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseBirthday(value) {
  if (typeof value !== "string") {
    throw new Error(
      'must use the full "Month Day" format, for example "August 13".',
    );
  }

  const match = BIRTHDAY_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      'must use the full "Month Day" format, for example "August 13".',
    );
  }

  const month = MONTH_NAMES.indexOf(match[1]) + 1;
  const day = Number(match[2]);

  // A leap year keeps February 29 valid as a recurring birthday.
  if (day > daysInMonth(2000, month)) {
    throw new Error("is not a valid date.");
  }

  return { month, day };
}

export function getZonedDateParts(
  scheduledTime,
  timezone = TIMEZONE,
) {
  const date = new Date(scheduledTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Scheduled time must be a valid date or Unix timestamp.");
  }

  const formatter = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    month: "numeric",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
  };
}

export function addCalendarDays({ year, month, day }, numberOfDays) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + numberOfDays);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function ordinal(day) {
  const lastTwoDigits = day % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${day}th`;

  const suffix = { 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th";
  return `${day}${suffix}`;
}

function formatReminderDate({ year, month, day }) {
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} the ${ordinal(day)} of ${MONTH_ABBREVIATIONS[month - 1]}`;
}

function isBirthdayOnDate(birthday, date) {
  return birthday.month === date.month && birthday.day === date.day;
}

export function createBirthdayMessages(
  friends,
  scheduledTime,
  {
    timezone = TIMEZONE,
    reminderDays = DEFAULT_REMINDER_DAYS,
  } = {},
) {
  const today = getZonedDateParts(scheduledTime, timezone);
  const reminderDate = addCalendarDays(today, reminderDays);
  const messages = [];

  for (const friend of friends) {
    const birthday = parseBirthday(friend.birthday);

    if (isBirthdayOnDate(birthday, today)) {
      messages.push({
        content: `Happy birthday to <@${friend.discordUserId}>!!! :partying_face: :confetti_ball: :beers:\n${BIRTHDAY_GIF_URL}`,
        discordUserId: friend.discordUserId,
      });
    }

    if (isBirthdayOnDate(birthday, reminderDate)) {
      messages.push({
        content: `It's <@${friend.discordUserId}>'s birthday in ${reminderDays} days - ${formatReminderDate(reminderDate)}. What's the plan?`,
        discordUserId: friend.discordUserId,
      });
    }
  }

  return messages;
}
