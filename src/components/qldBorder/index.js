const fetch = require("node-fetch");
const cheerio = require("cheerio");

const randomGif = require("../../shared/randomGif");
const acceptedMessages = require("./acceptedMessages");

async function checkIfOpen(msg) {
  const response = await fetch("https://covidlive.com.au/");
  const responseBody = await response.text();
  const $ = cheerio.load(responseBody);

  // Number of days VIC needs to have completed without a mystery case.
  const qldThreshold = 28;

  const unknownCases = $(
    "h3:contains('Days since last community transmission')"
  )
    .next()
    .children();
  const vicUnknownDaysString = unknownCases
    .find("a:contains('VIC')")
    .parent()
    .find("p")
    .text()
    .trim();

  const vicUnknownDays = parseInt(vicUnknownDaysString);

  if (isNaN(vicUnknownDays)) {
    console.error("ERROR: Can't find case number");
    msg.channel.send(
      "Oh no, i cawn't find the numbews tuwu figuwe out if queenswand iws open tuwu victowians."
    );
    return;
  }

  const daysToGo = qldThreshold - vicUnknownDays;
  
  let progressUpdate = `It's been ${vicUnknownDays} days since Victoria's last mystery case.`;

  if (daysToGo > 0) {
    progressUpdate = progressUpdate.concat(` ${daysToGo} days to go.`);
  }

  switch (true) {
    case daysToGo > 21:
      msg.channel.send(`**Not yet.** ${progressUpdate}`);
      break;
    case (daysToGo <= 21 && daysToGo > 14):
      msg.channel.send(`**We're making progress.** ${progressUpdate}`);
      break;
    case (daysToGo <= 14 && daysToGo > 7):
        msg.channel.send(`**We've passed the halfway point.** ${progressUpdate}`);
        break;
    case (daysToGo <= 7 && daysToGo > 0):
        msg.channel.send(`**SO CLOSE.** ${progressUpdate}`);
        break;
    case (daysToGo <= 0):
        msg.channel.send(`**YES!** ${progressUpdate}`);
        msg.channel.send(await randomGif('yes'));
  }
}

module.exports = {
  acceptedMessages,
  checkIfOpen,
};
