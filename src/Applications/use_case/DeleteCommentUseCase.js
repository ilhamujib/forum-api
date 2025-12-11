class DeleteCommentUseCase {
  constructor({ commentRepository, threadRepository }) {
    this._commentRepository = commentRepository;
    this._threadRepository = threadRepository;
  }

  async execute(useCasePayload, owner) {
    this._validatePayload(useCasePayload);
    const { threadId, commentId } = useCasePayload;
    
    // Logic bisnis:
    // 1. Cek apakah thread ada (optional, tapi good practice)
    await this._threadRepository.checkAvailabilityThread(threadId); // Pastikan fungsi ini ada di ThreadRepository abstract & postgres
    
    // 2. Cek apakah comment ada
    await this._commentRepository.checkCommentAvailability(commentId);
    
    // 3. Cek apakah user adalah pemilik comment
    await this._commentRepository.verifyCommentOwner(commentId, owner);
    
    // 4. Lakukan penghapusan
    await this._commentRepository.deleteComment(commentId);
  }

  _validatePayload(payload) {
    const { commentId, threadId } = payload;
    if (!threadId || !commentId) {
      throw new Error('DELETE_COMMENT_USE_CASE.NOT_CONTAIN_COMMENT_ID_OR_THREAD_ID');
    }

    if (typeof threadId !== 'string' || typeof commentId !== 'string') {
      throw new Error('DELETE_COMMENT_USE_CASE.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}

module.exports = DeleteCommentUseCase;