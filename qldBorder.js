const fetch = require("node-fetch");
const cheerio = require("cheerio");

const acceptedMessages = [
    "brisbane plz",
    "brisbane please",
    "queensland plz",
    "queensland please",
    "can i go to brisbane?",
    "can I go to queensland?",
    "can i go to brisbane yet?",
    "can i go to queensland yet?",
    "can i go to brisbane",
    "can i go to queensland",
    "can i go to brisbane yet",
    "can i go to queensland yet",
]

async function checkIfOpen(msg) {
  const response = await fetch("https://covidlive.com.au/");
  const responseBody = await response.text();
  const $ = cheerio.load(responseBody);

  // Number of days VIC needs to have completed without a mystery case.
  const qldOpenThreshold = 28

  const unknownCases = $("h3:contains('Days Since Last Community Transmission')").next().children();
  const vicUnknownDaysString = unknownCases.find("a:contains('VIC')").parent().find('p').text().trim();
  const vicUnknownDays = parseInt(vicUnknownDaysString);

  if (isNaN(vicUnknownDays)) {
      console.error("ERROR: Can't find case number");
      msg.channel.send("Oh no, i cawn't find the numbews tuwu figuwe out if queenswand iws open tuwu victowians.");
      return;
  }

  if (vicUnknownDays < qldOpenThreshold) {
    msg.channel.send(`No, Victoria has only gone ${vicUnknownDays} days without a mystery case.`);
    msg.channel.send(`Queensland requires ${qldOpenThreshold} days without mystery cases before they'll open to Victorians.`);
    return;
  } else {
    msg.channel.send(`Yes, Victoria has gone ${vicUnknownDays} days without a mystery case.`);
    msg.channel.send(`This meets the threshold Queensland expects from Victoria.`);
    return;
  }
}

module.exports = {
  acceptedMessages,
  checkIfOpen
}
