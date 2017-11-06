
const { map, parallel } = require('asyncro');
const { inspect } = require('util');
const BatchLoader = require('../lib');
const { posts, comments, users } = require('../tests/helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;
const options = {}; // { batch: false, cache: false };

tester(options)
  .then(data => inspector('data', data))

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

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
