const Discord = require("discord.js");

function constructMessageEmbed({
  thresholdPassed,
  vicUnknownDays,
  qldThreshold,
  lastUpdated,
}) {
  const embed = new Discord.MessageEmbed()
    .setColor(thresholdPassed ? "#41C92B" : "#BE0000")
    .setAuthor(
      "Covid Live",
      "https://covidlive.com.au/images/icons/active.png",
      "https://covidlive.com.au/"
    )
    .addFields(
      {
        name: "Days since last VIC mystery case",
        value: `${vicUnknownDays} days`,
      },
      { name: "Queensland border threshold", value: `${qldThreshold} days` }
    )
    .setFooter(lastUpdated);

  return embed;
}

module.exports = constructMessageEmbed;