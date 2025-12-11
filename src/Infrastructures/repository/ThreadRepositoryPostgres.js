const NotFoundError = require('../../Commons/exceptions/NotFoundError');
const NewThreadAdded = require('../../Domains/threads/entities/NewThreadAdded');
const ThreadRepository = require('../../Domains/threads/ThreadRepository');

class ThreadRepositoryPostgres extends ThreadRepository {
  constructor(pool, idGenerator) {
    super();
    this._pool = pool;
    this._idGenerator = idGenerator;
  }

  async addThread(newThread, owner) {
    const { title, body } = newThread;
    const id = `thread-${this._idGenerator()}`;
    const date = new Date().toISOString();

    const query = {
      text: 'INSERT INTO threads(id, title, owner, body, date) VALUES($1, $2, $3, $4, $5) RETURNING id, title, owner',
      values: [id, title, owner, body, date],
    };

    const result = await this._pool.query(query);

    return new NewThreadAdded({ ...result.rows[0] });
  }

  async checkAvailabilityThread(threadId) {
    const query = {
      text: 'SELECT id FROM threads WHERE id = $1',
      values: [threadId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('thread tidak ditemukan');
    }
  }

  async getThreadById(threadId) {
    const query = {
      text: `SELECT 
              t.id,
              t.title,
              t.body,
              t.date,
              u.username
            FROM threads t
            JOIN users u ON t.owner = u.id
            WHERE t.id = $1`,
      values: [threadId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('thread tidak ditemukan');
    }

    return result.rows[0];
  }
}

module.exports = ThreadRepositoryPostgres;