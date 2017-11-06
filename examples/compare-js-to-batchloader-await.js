
const { map } = require('asyncro');
// const { inspect } = require('util');
const BatchLoader = require('../lib/index');
const { posts, comments } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

async function tester (fn) {
  const postRecords = await posts.find();

  await map(postRecords, async post => {
    post.commentRecords = await fn(post.id);
  });
}

const commentsBatchLoader1 = new BatchLoader(
  commentsBatchLoaderResolver, { batch: false, cache: false }
);

const commentsBatchLoader2 = new BatchLoader(
  commentsBatchLoaderResolver
);

async function commentsBatchLoaderResolver (keys) {
  console.log('... comments batchLoader resolver', keys);

  const commentRecords = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
  return getResultsByKey(keys, commentRecords, comment => comment.postId, '[!]');
}

describe('compare-js-to-batchloader-await', () => {
  it('Compare JS to BatchLoader with and without batch and cache.', async () => {
    console.log('\n=== Normal JavaScript');
    await tester(async key => comments.find({ query: { postId: key } }));

    console.log('\n=== Using BatchLoader with neither batching mor caching');
    await tester(async key => commentsBatchLoader1.load(key));

    console.log('\n=== Using BatchLoader with batching and caching');
    await tester(async key => commentsBatchLoader2.load(key));
  });
});

/*
function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
*/
