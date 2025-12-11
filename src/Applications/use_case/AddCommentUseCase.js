const NewComment = require('../../Domains/comments/entities/NewComment');

class AddCommentUseCase {
  constructor({ commentRepository, threadRepository }) {
    this._commentRepository = commentRepository;
    this._threadRepository = threadRepository;
  }

  async execute(useCasePayload) {
    const newComment = new NewComment(useCasePayload);
    const { threadId } = newComment;

    // Cek apakah thread ada menggunakan fungsi availability (lebih efisien)
    await this._threadRepository.checkAvailabilityThread(threadId);

    return this._commentRepository.addComment(newComment);
  }
}

module.exports = AddCommentUseCase;