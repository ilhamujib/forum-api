const NewCommentAdded = require('../NewCommentAdded');

describe('NewCommentAdded entities', () => {
  it('should throw error when payload not contain needed property', () => {
    // Arrange
    const payload = {
      content: 'content',
      owner: 'owner',
    };

    // Action & Assert
    expect(() => new NewCommentAdded(payload)).toThrowError('NEW_COMMENT_ADDED.NOT_CONTAIN_NEEDED_PROPERTY');
  });

  it('should throw error when payload not meet data type specification', () => {
    // Arrange
    const payload = {
      id: {},
      content: 'content',
      owner: 1234,
    };

    // Action & Assert
    expect(() => new NewCommentAdded(payload)).toThrowError('NEW_COMMENT_ADDED.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });

  it('should create NewCommentAdded entities correctly', () => {
    // Arrange
    const payload = {
      id: 'id-123',
      content: 'content',
      owner: 'owner',
    };

    // Action
    const newThread = new NewCommentAdded(payload);

    // Assert
    expect(newThread).toBeInstanceOf(NewCommentAdded);
    expect(newThread.id).toEqual(payload.id);
    expect(newThread.content).toEqual(payload.content);
    expect(newThread.owner).toEqual(payload.owner);
  });
});
