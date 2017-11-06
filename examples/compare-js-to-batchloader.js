
const { inspect } = require('util');
const BatchLoader = require('../lib/index');
const { posts, comments } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

function tester (fn) {
  return posts.find()
    .then(posts => {
      return Promise.all(posts.map(post => {
        return fn(post.id)
          .then(comments => {
            post.commentRecords = comments;
            return post;
          });
      }));
    })
    .catch(err => console.log(err));
}

function commentsBatchLoaderResolver (keys) {
  console.log('... comments batchLoader resolver', keys);

  return comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, comment => comment.postId, '[!]'));
}

describe('compare-js-to-batchloader', () => {
  it('Compare JS to BatchLoader with and without batch and cache.', () => {
    return Promise.resolve()
      .then(() => {
        console.log('\n=== Normal JavaScript');
        return tester(key => comments.find({ query: { postId: key } }));
      })

      .then(() => {
        console.log('\n=== Using BatchLoader with neither batching mor caching');

        const commentsBatchLoader1 = new BatchLoader(
          commentsBatchLoaderResolver, { batch: false, cache: false }
        );

        return tester(key => commentsBatchLoader1.load(key));
      })

      .then(() => {
        console.log('\n=== Using BatchLoader with batching and caching');

        const commentsBatchLoader2 = new BatchLoader(
          commentsBatchLoaderResolver
        );

        return tester(key => commentsBatchLoader2.load(key));
      })

      .then(posts => inspector('\n=== posts', posts));
  });
});

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
