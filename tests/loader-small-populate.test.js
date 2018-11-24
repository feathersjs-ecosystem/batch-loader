
const { assert } = require('chai');
const BatchLoader = require('../lib');
const { posts, comments } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

const options = {}; // { batch: false, cache: false }

const commentsLoaderPromises = new BatchLoader(
  keys => comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, comment => comment.postId, '[]')),
  options
);

const commentsLoaderAwait = new BatchLoader(async keys => {
    const postRecords = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
    return getResultsByKey(keys, postRecords, comment => comment.postId, '[]');
  },
  options
);

const result = [
  { id: 1,
    body: 'John post',
    userId: 101,
    starIds: [ 102, 103, 104 ],
    commentRecords:
      [ { id: 11,
        text: 'John post Marshall comment 11',
        postId: 1,
        userId: 102 },
        { id: 12,
          text: 'John post Marshall comment 12',
          postId: 1,
          userId: 102 },
        { id: 13,
          text: 'John post Marshall comment 13',
          postId: 1,
          userId: 102 } ] },
  { id: 2,
    body: 'Marshall post',
    userId: 102,
    starIds: [ 101, 103, 104 ],
    commentRecords:
      [ { id: 14,
        text: 'Marshall post John comment 14',
        postId: 2,
        userId: 101 },
        { id: 15,
          text: 'Marshall post John comment 15',
          postId: 2,
          userId: 101 } ] },
  { id: 3,
    body: 'Barbara post',
    userId: 103,
    commentRecords:
      [ { id: 16,
        text: 'Barbara post John comment 16',
        postId: 3,
        userId: 101 } ] },
  { id: 4,
    body: 'Aubree post',
    userId: 104,
    commentRecords:
      [ { id: 17,
        text: 'Aubree post Marshall comment 17',
        postId: 4,
        userId: 102 } ] } ];

describe('loader-small-populate.test.js', () => {
  it('using Promises', () => {
    return posts.find()
      .then(postRecords => Promise.all(postRecords.map(post => commentsLoaderPromises.load(post.id)
        .then(comments => {
          post.commentRecords = comments;
          return post;
        })
      )))
      .then(data => {
        assert.deepEqual(data, result);
      });
  });

  it('using async/await', async () => {
    const postRecords = await posts.find();
    const data = await Promise.all(postRecords.map(async post => {
      post.commentRecords = await commentsLoaderAwait.load(post.id);
      return post;
    }));

    assert.deepEqual(data, result);
  });

  it('null key', async () => {
    const returns = await commentsLoaderAwait.load(null);

    assert.strictEqual(returns, null);
  });
});
