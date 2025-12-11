const NewThreadAdded = require('../NewThreadAdded');

describe('NewThreadAdded entities', () => {
  it('should throw error when payload not contain needed property', () => {
    // Arrange
    const payload = {
      title: 'title',
      owner: 'owner',
    };

    // Action & Assert
    expect(() => new NewThreadAdded(payload)).toThrowError('NEW_THREAD_ADDED.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw error when payload not meet data type specification', () => {
    // Arrange
    const payload = {
      id: {},
      title: 'title',
      owner: 1234,
    };

    // Action & Assert
    expect(() => new NewThreadAdded(payload)).toThrowError('NEW_THREAD_ADDED.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should create NewThreadAdded entities correctly', () => {
    // Arrange
    const payload = {
      id: 'id-123',
      title: 'title',
      owner: 'owner',
    };

    // Action
    const newThread = new NewThreadAdded(payload);

    // Assert
    expect(newThread).toBeInstanceOf(NewThreadAdded);
    expect(newThread.id).toEqual(payload.id);
    expect(newThread.title).toEqual(payload.title);
    expect(newThread.owner).toEqual(payload.owner);
  });
});
