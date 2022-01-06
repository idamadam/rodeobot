const spacetime = require('spacetime');
const _ = require('underscore');
const buildBirthdayMessages = require('../index')

const mockToday = spacetime.today().format('{date} {month}');
const mockBirthdayIn2Weeks = spacetime.now().add(14, 'days').format('{date} {month}');

describe('birthday messages', () => {
  const exampleData = [
    {
      "name": "birthdayToday",
      "birthday": mockToday,
      "discordUsername": '12345'
    },
    {
      "name": "birthdaySoon",
      "birthday": mockBirthdayIn2Weeks,
      "discordUsername": '67890'
    }
  ]

  const messages = buildBirthdayMessages(exampleData, 'Australia/Melbourne');

  test('wishes happy birthday to people', () => {
    const birthdayUser = _.findWhere(exampleData, {name: "birthdayToday"});
    const happyBdayRegex = new RegExp(`happy birthday .* <@${birthdayUser.discordUsername}>`, 'i');

    const expected = [
      expect.stringMatching(happyBdayRegex)
    ]

    expect(messages).toEqual(expect.arrayContaining(expected));
  });

  test('sends a reminder 2 weeks before someone\'s birthday', () => {
    const reminderUser = _.findWhere(exampleData, {name: "birthdaySoon"});
    const reminderRegex = new RegExp(`<@${reminderUser.discordUsername}>'s birthday in .* what's the plan`, 'i');
    
    const expected = [
      expect.stringMatching(reminderRegex)
    ]
    
    expect(messages).toEqual(expect.arrayContaining(expected));
  });
})