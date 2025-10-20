const sendBirthdayMessages = require('../sendBirthdayMessages');

describe('sendBirthdayMessages', () => {
  let mockClient;
  let mockChannel;
  let mockBirthdayService;
  let originalEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.FRIENDS_JSON;

    // Mock channel
    mockChannel = {
      send: jest.fn().mockResolvedValue({}),
      isTextBased: jest.fn().mockReturnValue(true),
      type: 0 // Text channel
    };

    // Mock client
    mockClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(mockChannel)
      }
    };

    // Mock birthday service
    mockBirthdayService = {
      getBirthdayMessages: jest.fn().mockReturnValue([])
    };

    // Set up default env
    process.env.FRIENDS_JSON = JSON.stringify([
      { discordUsername: 'user1', birthday: 'April 15' }
    ]);

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.FRIENDS_JSON = originalEnv;
    } else {
      delete process.env.FRIENDS_JSON;
    }

    jest.restoreAllMocks();
  });

  test('should load friends and send messages when birthdays exist', async () => {
    mockBirthdayService.getBirthdayMessages.mockReturnValue([
      'Happy birthday!',
      'https://giphy.com/example.gif'
    ]);

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(mockBirthdayService.getBirthdayMessages).toHaveBeenCalledWith([
      { discordUsername: 'user1', birthday: 'April 15' }
    ]);
    expect(mockClient.channels.fetch).toHaveBeenCalledWith('channel123');
    expect(mockChannel.send).toHaveBeenCalledTimes(2);
    expect(mockChannel.send).toHaveBeenNthCalledWith(1, 'Happy birthday!');
    expect(mockChannel.send).toHaveBeenNthCalledWith(2, 'https://giphy.com/example.gif');
  });

  test('should not send messages when no birthdays exist', async () => {
    mockBirthdayService.getBirthdayMessages.mockReturnValue([]);

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(mockBirthdayService.getBirthdayMessages).toHaveBeenCalled();
    expect(mockClient.channels.fetch).not.toHaveBeenCalled();
    expect(mockChannel.send).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No birthday messages to send today.');
  });

  test('should handle missing FRIENDS_JSON gracefully', async () => {
    delete process.env.FRIENDS_JSON;

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to load friend data:',
      'FRIENDS_JSON environment variable is not set.'
    );
    expect(mockBirthdayService.getBirthdayMessages).not.toHaveBeenCalled();
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should handle invalid FRIENDS_JSON gracefully', async () => {
    process.env.FRIENDS_JSON = 'invalid json {';

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to load friend data:',
      expect.stringContaining('Failed to parse FRIENDS_JSON')
    );
    expect(mockBirthdayService.getBirthdayMessages).not.toHaveBeenCalled();
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should handle channel fetch failure gracefully', async () => {
    mockClient.channels.fetch.mockRejectedValue(new Error('Unknown Channel'));
    mockBirthdayService.getBirthdayMessages.mockReturnValue(['Happy birthday!']);

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith('Failed to fetch channel:', 'Unknown Channel');
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should handle null channel gracefully', async () => {
    mockClient.channels.fetch.mockResolvedValue(null);
    mockBirthdayService.getBirthdayMessages.mockReturnValue(['Happy birthday!']);

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith('Channel channel123 not found');
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should handle non-text channel gracefully', async () => {
    mockChannel.isTextBased.mockReturnValue(false);
    mockChannel.type = 2; // Voice channel
    mockBirthdayService.getBirthdayMessages.mockReturnValue(['Happy birthday!']);

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith('Channel channel123 is not text-based (type: 2)');
    expect(mockChannel.send).not.toHaveBeenCalled();
  });

  test('should handle message send failure gracefully', async () => {
    mockBirthdayService.getBirthdayMessages.mockReturnValue(['Happy birthday!']);
    mockChannel.send.mockRejectedValue(new Error('Missing Permissions'));

    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(console.error).toHaveBeenCalledWith('Error sending messages:', 'Missing Permissions');
  });

  test('should reload friend data on each invocation', async () => {
    mockBirthdayService.getBirthdayMessages.mockReturnValue([]);

    // First call
    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(mockBirthdayService.getBirthdayMessages).toHaveBeenCalledWith([
      { discordUsername: 'user1', birthday: 'April 15' }
    ]);

    // Update env
    process.env.FRIENDS_JSON = JSON.stringify([
      { discordUsername: 'user2', birthday: 'May 20' }
    ]);

    // Second call
    await sendBirthdayMessages({
      client: mockClient,
      birthdayService: mockBirthdayService,
      channelId: 'channel123'
    });

    expect(mockBirthdayService.getBirthdayMessages).toHaveBeenCalledWith([
      { discordUsername: 'user2', birthday: 'May 20' }
    ]);
  });
});
