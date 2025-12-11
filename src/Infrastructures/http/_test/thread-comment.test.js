const pool = require('../../database/postgres/pool');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const container = require('../../container');
const createServer = require('../createServer');

describe('Threads & Comments routes', () => {
  afterEach(async () => {
    await UsersTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  const createServerAndGetAccessToken = async (username = 'dicoding') => {
    const server = await createServer(container);

    // register user
    await server.inject({
      method: 'POST',
      url: '/users',
      payload: {
        username,
        password: 'secret',
        fullname: 'Dicoding Indonesia',
      },
    });

    // login to get access token
    const loginRes = await server.inject({
      method: 'POST',
      url: '/authentications',
      payload: {
        username,
        password: 'secret',
      },
    });

    const loginJson = JSON.parse(loginRes.payload);
    const accessToken = loginJson.data.accessToken;

    return { server, accessToken };
  };

  describe('GET /threads/{threadId} (public)', () => {
    it('should return 404 when thread not found', async () => {
      const server = await createServer(container);

      const response = await server.inject({
        method: 'GET',
        url: '/threads/thread-unknown',
      });

      const responseJson = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(responseJson.status).toEqual('fail');
      expect(responseJson.message).toBeDefined();
      expect(responseJson.message).not.toHaveLength(0);
    });

    // ... test case selanjutnya ...

    it('should return thread detail with comments (deleted comments show replacement) ordered ascending', async () => {
      // Arrange: create two users A and B
      const { server, accessToken: tokenA } = await createServerAndGetAccessToken('userA');
      const { accessToken: tokenB } = await createServerAndGetAccessToken('userB');

      // create a thread by userA
      const createThreadRes = await server.inject({
        method: 'POST',
        url: '/threads',
        payload: { title: 'thread title', body: 'thread body' },
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const threadJson = JSON.parse(createThreadRes.payload);
      const threadId = threadJson.data.addedThread.id;

      // userB posts first comment (will be first by date)
      const addCommentRes1 = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: { content: 'first comment' },
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const addedComment1 = JSON.parse(addCommentRes1.payload).data.addedComment;
      const commentId1 = addedComment1.id;

      // userA posts second comment
      const addCommentRes2 = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: { content: 'second comment' },
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const addedComment2 = JSON.parse(addCommentRes2.payload).data.addedComment;
      const commentId2 = addedComment2.id;

      // try delete comment1 with non-owner (userA) -> should be 403
      const deleteByNonOwner = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId1}`,
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const deleteByNonOwnerJson = JSON.parse(deleteByNonOwner.payload);
      expect(deleteByNonOwner.statusCode).toEqual(403);
      expect(deleteByNonOwnerJson.status).toEqual('fail');
      expect(deleteByNonOwnerJson.message).toBeDefined();
      expect(deleteByNonOwnerJson.message).not.toHaveLength(0);

      // delete comment1 by its owner (userB)
      const deleteByOwner = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId1}`,
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const deleteByOwnerJson = JSON.parse(deleteByOwner.payload);
      expect(deleteByOwner.statusCode).toBeLessThanOrEqual(204); // allow 200/204
      expect(deleteByOwnerJson.status).toEqual('success');

      // GET thread detail and assert comments
      const getDetailRes = await server.inject({
        method: 'GET',
        url: `/threads/${threadId}`,
      });
      const getDetailJson = JSON.parse(getDetailRes.payload);
      expect(getDetailRes.statusCode).toEqual(200);
      expect(getDetailJson.status).toEqual('success');
      const thread = getDetailJson.data.thread;

      expect(thread).toHaveProperty('id', threadId);
      expect(thread).toHaveProperty('title');
      expect(thread).toHaveProperty('body');
      expect(thread).toHaveProperty('date');
      expect(thread).toHaveProperty('username');
      expect(Array.isArray(thread.comments)).toBe(true);
      expect(thread.comments).toHaveLength(2);

      // first comment should be the deleted one and content replaced
      expect(thread.comments[0]).toHaveProperty('id', commentId1);
      expect(thread.comments[0]).toHaveProperty('content', '**komentar telah dihapus**');

      // second comment should be original
      expect(thread.comments[1]).toHaveProperty('id', commentId2);
      expect(thread.comments[1]).toHaveProperty('content', 'second comment');

      // ensure ascending order by date
      const dates = thread.comments.map((c) => new Date(c.date).getTime());
      expect(dates[0]).toBeLessThanOrEqual(dates[1]);
    });
  });

  describe('POST /threads/{threadId}/comments (restricted)', () => {

    it('should respond 404 when thread not found', async () => {
      const { server, accessToken } = await createServerAndGetAccessToken('poster');
      const response = await server.inject({
        method: 'POST',
        url: '/threads/thread-notfound/comments',
        payload: { content: 'some' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(json.status).toEqual('fail');
      expect(json.message).toBeDefined();
      expect(json.message).not.toHaveLength(0);
    });

    it('should respond 400 when payload invalid', async () => {
      const { server, accessToken } = await createServerAndGetAccessToken('poster2');

      // create a thread to comment on
      const createThreadRes = await server.inject({
        method: 'POST',
        url: '/threads',
        payload: { title: 't', body: 'b' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const threadId = JSON.parse(createThreadRes.payload).data.addedThread.id;

      // invalid payload (missing content)
      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: {},
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(400);
      expect(json.status).toEqual('fail');
      expect(json.message).toBeDefined();
      expect(json.message).not.toHaveLength(0);
    });

    it('should respond 201 and return addedComment when valid and authorized', async () => {
      const { server, accessToken } = await createServerAndGetAccessToken('poster3');

      // create a thread to comment on
      const createThreadRes = await server.inject({
        method: 'POST',
        url: '/threads',
        payload: { title: 't', body: 'b' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const threadId = JSON.parse(createThreadRes.payload).data.addedThread.id;

      const response = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: { content: 'a comment' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(201);
      expect(json.status).toEqual('success');
      expect(json.data).toBeDefined();
      expect(json.data.addedComment).toBeDefined();
      expect(json.data.addedComment.id).toBeDefined();
      expect(json.data.addedComment.content).toEqual('a comment');
      expect(json.data.addedComment.owner).toBeDefined();
    });
  });

  describe('DELETE /threads/{threadId}/comments/{commentId} (restricted)', () => {

    it('should respond 404 when thread or comment not found', async () => {
      const { server, accessToken } = await createServerAndGetAccessToken('deleter');
      const response = await server.inject({
        method: 'DELETE',
        url: '/threads/thread-unknown/comments/comment-unknown',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const json = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(404);
      expect(json.status).toEqual('fail');
      expect(json.message).toBeDefined();
      expect(json.message).not.toHaveLength(0);
    });

    it('should respond 403 when not the comment owner', async () => {
      // create owner and comment
      const { server, accessToken: ownerToken } = await createServerAndGetAccessToken('owner');
      const { accessToken: otherToken } = await createServerAndGetAccessToken('other');

      const createThreadRes = await server.inject({
        method: 'POST',
        url: '/threads',
        payload: { title: 't', body: 'b' },
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const threadId = JSON.parse(createThreadRes.payload).data.addedThread.id;

      const addCommentRes = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: { content: 'my comment' },
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const commentId = JSON.parse(addCommentRes.payload).data.addedComment.id;

      const response = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      const json = JSON.parse(response.payload);
      expect(response.statusCode).toEqual(403);
      expect(json.status).toEqual('fail');
      expect(json.message).toBeDefined();
      expect(json.message).not.toHaveLength(0);
    });

    it('should respond success when owner deletes comment (soft delete)', async () => {
      const { server, accessToken } = await createServerAndGetAccessToken('owner2');

      const createThreadRes = await server.inject({
        method: 'POST',
        url: '/threads',
        payload: { title: 't', body: 'b' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const threadId = JSON.parse(createThreadRes.payload).data.addedThread.id;

      const addCommentRes = await server.inject({
        method: 'POST',
        url: `/threads/${threadId}/comments`,
        payload: { content: 'to be deleted' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const commentId = JSON.parse(addCommentRes.payload).data.addedComment.id;

      const deleteRes = await server.inject({
        method: 'DELETE',
        url: `/threads/${threadId}/comments/${commentId}`,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const deleteJson = JSON.parse(deleteRes.payload);
      expect(deleteJson.status).toEqual('success');

      // after that, GET thread should show replaced content '**komentar telah dihapus**'
      const getDetailRes = await server.inject({
        method: 'GET',
        url: `/threads/${threadId}`,
      });
      const thread = JSON.parse(getDetailRes.payload).data.thread;
      const deletedComment = thread.comments.find((c) => c.id === commentId);
      expect(deletedComment.content).toEqual('**komentar telah dihapus**');
    });
  });
});