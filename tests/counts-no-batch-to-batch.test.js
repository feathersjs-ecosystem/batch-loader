
const { assert } = require('chai');
const BatchLoader = require('../lib/index');
const { posts, comments, users } = require('./helpers/make-services');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

let countUsersResolver = 0;
let countCommentsResolver = 0;
let countUsersNoBatch;
let countCommentsNoBatch;
let countUsersBatch;
let countCommentsBatch;

function tester (options) {
  const commentsBatchLoader = new BatchLoader(
    keys => {
      countUsersResolver += 1;
      return comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } })
        .then(result => getResultsByKey(keys, result, comment => comment.postId, '[!]'))
    },
    options
  );

  const usersBatchLoader = new BatchLoader(
    keys => {
      countCommentsResolver += 1;
      return users.find({ query: { id: { $in: getUniqueKeys(keys) } } })
        .then(result => getResultsByKey(keys, result, user => user.id, '!'))
    },
    options
  );

  countUsersResolver = 0;
  countCommentsResolver = 0;

  return posts.find()
    .then(posts => {
      // Process each post record
      return Promise.all(posts.map(post => {
        return Promise.all([

          // Attach comments records
          commentsBatchLoader.load(post.id)
            .then(comments => {
              post.commentRecords = comments;

              // Process each comment record
              return Promise.all(comments.map(comment => {
                // Attach user record
                return usersBatchLoader.load(comment.userId)
                  .then(user => { comment.userRecord = user; });
              }));
            }),

          // Attach star user records
          Promise.resolve()
            .then(() => {
              if (!post.starIds) return null;

              return usersBatchLoader.loadMany(post.starIds) // Note that 'loadMany' is used.
                .then(users => { post.starUserRecords = users; });
            })
        ])
          .then(() => post);
      }));
    })
    .catch(err => console.log(err));
}

describe('counts-no-batch-to-batch.test.js', () => {
  it('Compare BatchLoader with neither batch nor cache, to BatchLoader with both.', () => {
    return Promise.resolve()
      .then(() => {
        //console.log('\n=== Using BatchLoader with neither batching nor caching');

        return tester({ batch: false, cache: false });
      })

      .then(() => {
        countUsersNoBatch = countUsersResolver;
        countCommentsNoBatch = countCommentsResolver;
        //console.log('\n=== Using BatchLoader with batching and caching');

        return tester();
      })

      .then(posts => {
        countUsersBatch = countUsersResolver;
        countCommentsBatch = countCommentsResolver;

        assert.equal(countUsersNoBatch, 4, 'countUsersNoBatch');
        assert.equal(countCommentsNoBatch, 13, 'countCommentsNoBatch');
        assert.equal(countUsersBatch, 1, 'countUsersBatch');
        assert.equal(countCommentsBatch, 1, 'countCommentsBatch');
      });
  });
});

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
