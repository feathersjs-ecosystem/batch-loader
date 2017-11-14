
const { assert } = require('chai');
const { map, parallel } = require('asyncro');
const BatchLoader = require('../lib');
const { posts, comments, users } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

const result = [
  { id: 1,
    body: 'John post',
    userId: 101,
    starIds: [ 102, 103, 104 ],
    userRecord: { id: 101, name: 'John' },
    starUserRecords:
      [ { id: 102, name: 'Marshall' },
        { id: 103, name: 'Barbara' },
        { id: 104, name: 'Aubree' } ],
    commentRecords:
      [ { id: 11,
        text: 'John post Marshall comment 11',
        postId: 1,
        userId: 102,
        userRecord: { id: 102, name: 'Marshall' } },
        { id: 12,
          text: 'John post Marshall comment 12',
          postId: 1,
          userId: 102,
          userRecord: { id: 102, name: 'Marshall' } },
        { id: 13,
          text: 'John post Marshall comment 13',
          postId: 1,
          userId: 102,
          userRecord: { id: 102, name: 'Marshall' } } ] },
  { id: 2,
    body: 'Marshall post',
    userId: 102,
    starIds: [ 101, 103, 104 ],
    userRecord: { id: 102, name: 'Marshall' },
    starUserRecords:
      [ { id: 101, name: 'John' },
        { id: 103, name: 'Barbara' },
        { id: 104, name: 'Aubree' } ],
    commentRecords:
      [ { id: 14,
        text: 'Marshall post John comment 14',
        postId: 2,
        userId: 101,
        userRecord: { id: 101, name: 'John' } },
        { id: 15,
          text: 'Marshall post John comment 15',
          postId: 2,
          userId: 101,
          userRecord: { id: 101, name: 'John' } } ] },
  { id: 3,
    body: 'Barbara post',
    userId: 103,
    userRecord: { id: 103, name: 'Barbara' },
    commentRecords:
      [ { id: 16,
        text: 'Barbara post John comment 16',
        postId: 3,
        userId: 101,
        userRecord: { id: 101, name: 'John' } } ] },
  { id: 4,
    body: 'Aubree post',
    userId: 104,
    userRecord: { id: 104, name: 'Aubree' },
    commentRecords:
      [ { id: 17,
        text: 'Aubree post Marshall comment 17',
        postId: 4,
        userId: 102,
        userRecord: { id: 102, name: 'Marshall' } } ] }
];

describe('loader-large-populate.js', () => {
  it('batch & cache', async () => {
    const data = await tester({});
    assert.deepEqual(data, result);
  });

  it('no batch & no cache', async () => {
    const data = await tester({ batch: false, cache: false });
    assert.deepEqual(data, result);
  });
});

async function tester (options) {
  const commentsBatchLoader = new BatchLoader(async keys => {
      const result = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
      return getResultsByKey(keys, result, comment => comment.postId, '[]');
    },
    options
  );

  const usersBatchLoader = new BatchLoader(async keys => {
      const result = await users.find({ query: { id: { $in: getUniqueKeys(keys) } } });
      return getResultsByKey(keys, result, user => user.id, '');
    },
    options
  );

  const postRecords = await posts.find();

  await map(postRecords, async post => {
    await parallel([
      // Join one users record to posts, for post.userId === users.id
      async () => {
        post.userRecord = await usersBatchLoader.load(post.userId);
      },
      // Join 0, 1 or many comments records to posts, where comments.postId === posts.id
      async () => {
        const commentRecords = await commentsBatchLoader.load(post.id);
        post.commentRecords = commentRecords;

        // Join one users record to comments, for comments.userId === users.id
        await map(commentRecords, async comment => {
          comment.userRecord = await usersBatchLoader.load(comment.userId);
        });
      },
      // Join 0, 1 or many users record to posts, where posts.starIds === users.id
      async () => {
        if (!post.starIds) return null;

        post.starUserRecords = await usersBatchLoader.loadMany(post.starIds);
      }
    ]);
  });

  return postRecords;
}
