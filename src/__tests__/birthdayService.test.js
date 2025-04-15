const BirthdayService = require('../birthdayService');
const spacetime = require('spacetime');

// Mock spacetime to control the current time
jest.mock('spacetime', () => {
  const actualSpacetime = jest.requireActual('spacetime');
  const mockSpacetime = jest.fn((...args) => actualSpacetime(...args));
  mockSpacetime.now = jest.fn();
  return mockSpacetime;
});

describe('BirthdayService', () => {
  let birthdayService;
  const mockFriends = [
    {
      discordUsername: 'user1',
      birthday: '2024-04-15' // Today's date in the test
    },
    {
      discordUsername: 'user2',
      birthday: '2024-04-29' // 14 days from today
    },
    {
      discordUsername: 'user3',
      birthday: '2024-05-15' // Not today or in 14 days
    }
  ];

  beforeEach(() => {
    birthdayService = new BirthdayService();
    // Set current time to April 15, 2024
    spacetime.now.mockReturnValue(spacetime('2024-04-15', 'Australia/Melbourne'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate birthday message for today', () => {
    const messages = birthdayService.getBirthdayMessages(mockFriends);
    
    expect(messages).toContain('Happy birthday to <@user1>!!! :partying_face: :confetti_ball: :beers:');
    expect(messages).toContain('https://media.giphy.com/media/yoJC2GnSClbPOkV0eA/giphy.gif');
  });

  test('should generate reminder message for upcoming birthday', () => {
    const messages = birthdayService.getBirthdayMessages(mockFriends);
    
    expect(messages).toContain("It's <@user2>'s birthday in 14 days - Monday the 29th of Apr. What's the plan?");
  });

  test('should not generate messages for non-matching dates', () => {
    const messages = birthdayService.getBirthdayMessages(mockFriends);
    
    expect(messages).not.toContain(expect.stringContaining('user3'));
  });

  test('should handle empty friends list', () => {
    const messages = birthdayService.getBirthdayMessages([]);
    expect(messages).toHaveLength(0);
  });
}); 