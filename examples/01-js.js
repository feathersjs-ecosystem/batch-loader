
const { inspect } = require('util');
const { posts, comments } = require('../tests/helpers/make-services');

// Populate using Promises.
Promise.resolve(posts.find()
  .then(postsRecords => Promise.all(postsRecords.map(post => comments.find({ query: { postId: post.id } })
    .then(comments => {
      post.commentRecords = comments;
      return post;
    })
  )))
)
  .then(data => {
    console.log(`\nNo batch loader, promises`);
    inspector('data', data);
  })

  // Populate using async/await.
  .then(async () => {
    const postsRecords = await posts.find();

    const data = await Promise.all(postsRecords.map(async post => {
      post.commentRecords = await comments.find({ query: { postId: post.id } });
      return post;
    }));

    console.log(`\nNo batch loader, async/await`);
    inspector('data', data);
  });

function inspector (desc, obj, depth = 5) {
  console.log(desc);
  console.log(inspect(obj, { depth, colors: true }));
}
