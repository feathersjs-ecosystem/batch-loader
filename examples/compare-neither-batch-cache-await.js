
const { map, parallel } = require('asyncro');
const { inspect } = require('util');
const BatchLoader = require('../lib/index');
const { posts, comments, users } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

const options = { batch: false, cache: false };

async function tester (options) {
  const commentsBatchLoader = new BatchLoader(
    async keys => {
      const result = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
      return getResultsByKey(keys, result, comment => comment.postId, '[!]');
    },
    options
  );

  const usersBatchLoader = new BatchLoader(
    async keys => {
      const result = await users.find({ query: { id: { $in: getUniqueKeys(keys) } } });
      return getResultsByKey(keys, result, user => user.id, '');
    },
    options
  );

  const postRecords = await posts.find();

  await map(postRecords, async post => {
    await parallel([
      async () => {
        post.userRecord = await usersBatchLoader.load(post.userId);
      },
      async () => {
        const commentRecords = await commentsBatchLoader.load(post.id);
        post.commentRecords = commentRecords;

        await map(commentRecords, async comment => {
          comment.userRecord = await usersBatchLoader.load(comment.userId);
        });
      },
      async () => {
        if (!post.starIds) return null;

        post.starUserRecords = await usersBatchLoader.loadMany(post.starIds);
      }
    ]);
  });

  return postRecords;
}

const data = tester(options);
inspector('data', data);

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
