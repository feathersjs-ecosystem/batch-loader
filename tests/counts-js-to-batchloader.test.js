
const { assert } = require('chai');
const BatchLoader = require('../lib/index');
const { posts, comments } = require('../tests/helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

let countJS = 0;
let countResolver = 0;
let countNoBatch = 0;
let countBatch = 0;

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
  //console.log('... comments batchLoader resolver', keys);
  countResolver += 1;

  return comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, comment => comment.postId, '[!]'));
}

describe('counts-js-to-batchloader.test.js', () => {
  it('Compare JS to BatchLoader with and without batch and cache.', () => {
    return Promise.resolve()
      .then(() => {
        //console.log('\n=== Normal JavaScript');
        return tester(key => {
          countJS += 1;
          return comments.find({ query: { postId: key } });
        });
      })

      .then(() => {
        //console.log('\n=== Using BatchLoader with neither batching mor caching');

        const commentsBatchLoader1 = new BatchLoader(
          commentsBatchLoaderResolver, { batch: false, cache: false }
        );

        countResolver = 0;
        return tester(key => commentsBatchLoader1.load(key));
      })

      .then(() => {
        countNoBatch = countResolver;
        //console.log('\n=== Using BatchLoader with batching and caching');

        const commentsBatchLoader2 = new BatchLoader(
          commentsBatchLoaderResolver
        );

        countResolver = 0;
        return tester(key => commentsBatchLoader2.load(key));
      })

      .then(posts => {
        countBatch = countResolver;

        assert(countJS, 4, 'countJS');
        assert(countNoBatch, 4, 'countNoBatch');
        assert(countBatch, 1, 'countBatch');
      });
  });
});
