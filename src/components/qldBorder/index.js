const fetch = require("node-fetch");
const cheerio = require("cheerio");

const randomGif = require('../../shared/randomGif');
const acceptedMessages = require('./acceptedMessages');
const constructMessageEmbed = require('./constructEmbed');

async function checkIfOpen(msg) {
  const response = await fetch("https://covidlive.com.au/");
  const responseBody = await response.text();
  const $ = cheerio.load(responseBody);

  // Number of days VIC needs to have completed without a mystery case.
  const qldThreshold = 28

  const unknownCases = $("h3:contains('Days Since Last Community Transmission')").next().children();
  const vicUnknownDaysString = unknownCases.find("a:contains('VIC')").parent().find('p').text().trim();

  const lastUpdated = $('td.LAST_UPDATED').text();
  const vicUnknownDays = parseInt(vicUnknownDaysString);

  if (isNaN(vicUnknownDays)) {
      console.error("ERROR: Can't find case number");
      msg.channel.send("Oh no, i cawn't find the numbews tuwu figuwe out if queenswand iws open tuwu victowians.");
      return;
  }

  if (vicUnknownDays < qldThreshold) {
    msg.channel.send(await randomGif('no'));
    msg.channel.send(constructMessageEmbed({ vicUnknownDays, qldThreshold, lastUpdated }));
    return;
  } else {
    msg.channel.send(await randomGif('yes'));
    msg.channel.send(constructMessageEmbed({ thresholdPassed: true, vicUnknownDays, qldThreshold, lastUpdated }));
    return;
  }
}

module.exports = {
  acceptedMessages,
  checkIfOpen
}
