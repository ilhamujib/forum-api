class GetDetailThreadUseCase {
  constructor({ threadRepository, commentRepository }) {
    this._threadRepository = threadRepository;
    this._commentRepository = commentRepository;
  }

  async execute(useCasePayload) {
    this._validatePayload(useCasePayload);
    const { threadId } = useCasePayload;

    // 1. Ambil detail thread
    const thread = await this._threadRepository.getThreadById(threadId);

    // 2. Ambil comments berdasarkan threadId
    const comments = await this._commentRepository.getCommentsByThreadId(threadId);

    // 3. Gabungkan dan format logic (Clean Architecture: Business Logic di UseCase/Entity)
    thread.comments = comments.map((comment) => ({
      id: comment.id,
      username: comment.username,
      date: comment.date,
      // Logic tampilan konten ditaruh di sini
      content: comment.is_delete ? '**komentar telah dihapus**' : comment.content, 
    }));

    return thread;
  }

  _validatePayload(payload) {
    const { threadId } = payload;
    if (!threadId) {
      throw new Error('GET_DETAIL_THREAD_USE_CASE.NOT_CONTAIN_THREAD_ID');
    }

    if (typeof threadId !== 'string') {
      throw new Error('GET_DETAIL_THREAD_USE_CASE.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION');
    }
  }
}

module.exports = GetDetailThreadUseCase;