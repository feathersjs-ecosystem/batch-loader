
const { inspect } = require('util');
const BatchLoader = require('../lib');
const { posts, comments } = require('../tests/helpers/make-services');

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

// Populate using Promises.
Promise.resolve(posts.find()
  .then(postRecords => Promise.all(postRecords.map(post => commentsLoaderPromises.load(post.id)
    .then(comments => {
      post.commentRecords = comments;
      return post;
    })
  )))
)
  .then(data => {
    console.log(`\nBatch loader, promises`);
    inspector('data', data);
  })

  // Populate using async/await.
  .then(async () => {
    const postRecords = await posts.find();
    const data = await Promise.all(postRecords.map(async post => {
      post.commentRecords = await commentsLoaderAwait.load(post.id);
      return post;
    }));

    console.log(`\nBatch loader, async/await`);
    inspector('data', data);
  });

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
