
const { assert } = require('chai');
const { posts, comments } = require('./helpers/make-services');

const result = [ { id: 1,
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

describe('loader-no-loader.test.js', () => {
  it('using Promises', () => {
    return posts.find()
      .then(postsRecords => Promise.all(
        postsRecords.map(post => comments.find({ query: { postId: post.id } })
          .then(comments => {
            post.commentRecords = comments;
            return post;
          })
        )
      ))

      .then(data => {
        assert.deepEqual(data, result);
      });
  });

  it('using async/await', async () => {
    const postsRecords = await posts.find();

    const data = await Promise.all(postsRecords.map(async post => {
      post.commentRecords = await comments.find({ query: { postId: post.id } });
      return post;
    }));

    assert.deepEqual(data, result);
  });
});
