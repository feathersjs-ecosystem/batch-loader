Loading data from database is one of the major tasks for most web applications. The goal of batch-loader is to improve the performance of database queries with two techniques: batching and caching.

## Batching

Batching is batch-loader's primary feature. The reason for batching is to merge multiple similar database queries into one single query when possible. For example:

```js
Promise.all([
  posts.find({ query: { id: 1 } }),
  posts.find({ query: { id: 2 } }),
  posts.find({ query: { id: { $in: [3, 4] } } }),
  posts.find({ query: { id: 5 } }),
]);
```

is slower than

```js
posts.find({ query: { id: { $in: [1, 2, 3, 4, 5] } } });
```

The latter sends only one query to database and retrieves the same 5 records as the former does, and therefore is much more efficient.

Batch-loader is a tool to help you batch database calls in such a way. First, create a batch-loader by providing a batch loading function which accepts an array of keys and an optional context. It returns a Promise which resolves to an array of values.

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const usersLoader = new BatchLoader((keys, context) => {
  return app.service('users').find({ query: { id: { $in: keys } } })
    .then(records => {
      recordsByKey = /* recordsByKey[i] is the value for key[i] */;
      return recordsByKey;
    });
  },
  { context: {} }
);
```

You can then call the batch-loader with individual keys. It will coalesce all requests made within the current event loop into a single call to the batch-loader function, and return the results to each call.

```js
usersLoader.load(1).then((user) => console.log("key 1", user));
usersLoader.load(2).then((user) => console.log("key 2", user));
usersLoader
  .loadMany([1, 2, 3, 4])
  .then((users) => console.log(users.length, users));
```

The above will result in one database service call, i.e. `users.find({ query: { id: { $in: [1, 2, 3, 4] } } })`, instead of 6.

<p class="tip">*"[W]ill coalesce all requests made within the current event loop into a single call"* sounds ominous. Just don't worry about it. Make `usersLoader.load` and `usersLoader.loadMany` calls the same way you would `users.get` and `users.find`. Everything will work as expected while, behind the scenes, batch-loader is making the fewest database calls logically possible.</p>

### Batch Function

The batch loading function accepts an array of keys and an optional context. It returns a Promise which resolves to an array of values. Each index in the returned array of values must correspond to the same index in the array of keys.

For example, if the `usersLoader` from above is called with `[1, 2, 3, 4, 99]`, we would execute `users.find({ query: { id: { $in: [1, 2, 3, 4, 99] } } })`. The Feathers service could return the results:

```js
[ { id: 4, name: 'Aubree' }
  { id: 2, name: 'Marshall' },
  { id: 1, name: 'John' },
  { id: 3, name: 'Barbara' } ]
```

Please not that the order of the results will usually differ from the order of the keys and here, in addition, there is no `users` with an `id` of `99`.

The batch function has to to reorganize the above results and return:

```js
[
  { id: 1, name: "John" },
  { id: 2, name: "Marshall" },
  { id: 3, name: "Barbara" },
  { id: 4, name: "Aubree" },
  null,
];
```

The `null` indicating there is no record for `user.id === 99`.

### Convenience Methods

Batch-loader provides two convenience functions that will perform this reorganization for you.

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const { getResultsByKey, getUniqueKeys } = BatchLoader;

const usersLoader = new BatchLoader(keys =>
  app.service('users').find({ query: { id: { $in: getUniqueKeys(keys) } } })
    .then(records => getResultsByKey(keys, records, user => user.id, ''));
);
```

**getUniqueKeys** eliminates any duplicate elements in the keys.

> The array of keys may contain duplicates when the batch-loader's memoization cache is disabled.

**getResultsByKey** reorganizes the records from the service call into the result expected from the batch function. The `''` parameter indicates each key expects a single record or `null`. Other options are `'!'` when each key requires a single record, and `'[]'` when each key requires an array of 0, 1 or more records.

## Caching

Each batch-loader instance contains a unique memoized cache. Once `load` or `loadMany` is called, the resulting value is cached. This eliminates redundant database requests, relieving pressure on your database. It also creates fewer objects which may relieve memory pressure on your application.

```js
Promise.all([userLoader.load(1), userLoader.load(1)]).then((users) =>
  assert(users[0] === users[1])
);
```

<p class="tip">The same object is returned for each of multiple hits on the cache. You should not mutate that object directly as the mutation would be reflected in every reference to the object. Rather you should deep-copy before mutating the copy.</p>

### Caching Per Request

It may be dangerous to use one cache across many users, and it is encouraged to create a new batch-loader per request. Typically batch-loader instances are created when a request begins and are released once the request ends.

Since the cache exists for a limited time only, the cache contents should not normally grow large enough to cause memory pressure on the application.

### Persistent Caches

A batch-loader can be shared between requests and between users if care is taken. Use caution when used in long-lived applications or those which serve many users with different access permissions.

The main advantage is having the cache already primed at the start of each request, which could result in fewer initial database requests.

#### Memory pressure

There are two concerns though. First the cache could keep filling up with records causing memory pressure. This can be handled with a custom cache.

**@feathers-plus/cache** is a least-recently-used (LRU) cache which you can inject when initializing the batch-loader. You can specify the maximum number of records to be kept in the cache, and it will retain the least recently used records.

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const cache = require('@feathers-plus/cache');

const usersLoader = new BatchLoader(
  keys => { ... },
  { cacheMap: cache({ max: 100 })
);
```

#### Mutation

The other concern is a record mutating. You can create a hook which clears a record from its BatchLoaders' caches when it mutates.

```js
usersLoader.clear(1);
```

> `@feathers-plus/cache/lib/hooks` contains hooks which clear the keys of mutated records.

## Explore Performance Gains

### Our Sample Data

We will be using Feathers database services containing the following data:

```js
// app.service('posts')
const postsStore = [
  { id: 1, body: "John post", userId: 101, starIds: [102, 103, 104] },
  { id: 2, body: "Marshall post", userId: 102, starIds: [101, 103, 104] },
  { id: 3, body: "Barbara post", userId: 103 },
  { id: 4, body: "Aubree post", userId: 104 },
];

// app.service('comments')
const commentsStore = [
  { id: 11, text: "John post Marshall comment 11", postId: 1, userId: 102 },
  { id: 12, text: "John post Marshall comment 12", postId: 1, userId: 102 },
  { id: 13, text: "John post Marshall comment 13", postId: 1, userId: 102 },
  { id: 14, text: "Marshall post John comment 14", postId: 2, userId: 101 },
  { id: 15, text: "Marshall post John comment 15", postId: 2, userId: 101 },
  { id: 16, text: "Barbara post John comment 16", postId: 3, userId: 101 },
  { id: 17, text: "Aubree post Marshall comment 17", postId: 4, userId: 102 },
];

// app.service('users')
const usersStore = [
  { id: 101, name: "John" },
  { id: 102, name: "Marshall" },
  { id: 103, name: "Barbara" },
  { id: 104, name: "Aubree" },
];
```

We want to see how using batch-loader affects the number of database calls, and we will do that by populating the `posts` records with related information.

### Using Plain JavaScript

First, let's add the related `comments` records to each `posts` record using regular JavaScript, and let's do this using both Promises and async/await.

```js
// Populate using Promises.
Promise.resolve(posts.find()
  .then(posts => Promise.all(posts.map(post => comments.find({ query: { postId: post.id } })
    .then(comments => {
      post.commentRecords = comments;
      return post;
    })
  )))
)
  .then(data => ... );

// Populate using async/await.
const postRecords = await posts.find();
const data = await Promise.all(postRecords.map(async post => {
  post.commentRecords = await comments.find({ query: { postId: post.id } });
  return post;
}));
```

Both of these make the following database service calls, and both get the following result.

```js
... posts find
... comments find { postId: 1 }
... comments find { postId: 2 }
... comments find { postId: 3 }
... comments find { postId: 4 }

[ { id: 1,
    body: 'John post',
    userId: 101,
    starIds: [ 102, 103, 104 ],
    commentRecords: [
      { id: 11, text: 'John post Marshall comment 11', postId: 1, userId: 102 },
      { id: 12, text: 'John post Marshall comment 12', postId: 1, userId: 102 },
      { id: 13, text: 'John post Marshall comment 13', postId: 1, userId: 102 } ] },
  { ... }
]
```

### Using Neither Batching nor Caching

The batch-loader function will be called for every `load` and `loadMany` when batching and caching are disabled in the batch-loader. This means it acts just like individual `get` and `find` method calls. Let's rewrite the above example using such a rudimentary batch-loader:

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const { getResultsByKey, getUniqueKeys } = BatchLoader;

// Populate using Promises.
const commentsLoaderPromises = new BatchLoader(
  keys => comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, comment => comment.postId, '[]')),
  { batch: false, cache: false }
);

Promise.resolve(posts.find()
  .then(postRecords => Promise.all(postRecords.map(post => commentsLoaderPromises.load(post.id)
    .then(comments => {
      post.commentRecords = comments;
      return post;
    })
  )))
)
  .then(data => { ... });

// Populate using async/await.
const commentsLoaderAwait = new BatchLoader(async keys => {
    const postRecords = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
    return getResultsByKey(keys, postRecords, comment => comment.postId, '[]');
  },
  { batch: false, cache: false }
);

const postRecords = await posts.find();
const data = await Promise.all(postRecords.map(async post => {
  post.commentRecords = await commentsLoaderAwait.load(post.id);
  return post;
}));
```

Both of these make the same database service calls as did the [plain JavaScript example](#Using-Plain-JavaScript), because batching and caching were both disabled.

```text
... posts find
... comments find { postId: { '$in': [ 1 ] } }
... comments find { postId: { '$in': [ 2 ] } }
... comments find { postId: { '$in': [ 3 ] } }
... comments find { postId: { '$in': [ 4 ] } }
```

> A batch-loader with neither batching nor caching makes the same database calls as does a plain Javascript implementation. This is a convenient way to debug issues you might have with batch-loader. The _"magic"_ disappears when you disable batching and caching, which makes it simpler to understand what is happening.

### Using Batching and Caching

Batching and caching are enabled when we remove the 2 `{ batch: false, cache: false }` in the above example. A very different performance profile is now produced:

```text
... posts find
... comments find { postId: { '$in': [ 1, 2, 3, 4 ] } }
```

Only 1 service call was made for the `comments` records, instead of the previous 4.

### A Realistic Example

The more service calls made, the better batch-loader performs. The above example populated the `posts` records with just the `comments` records. Let's see the effect batch-loader has when we fully populate the `posts` records.

```js
const { map, parallel } = require('asyncro');
const BatchLoader = require('@feathers-plus/batch-loader');

const { getResultsByKey, getUniqueKeys } = BatchLoader;

tester({ batch: false, cache: false })
  .then(data => { ... )

async function tester (options) {
  const commentsLoader = new BatchLoader(async keys => {
      const result = await comments.find({ query: { postId: { $in: getUniqueKeys(keys) } } });
      return getResultsByKey(keys, result, comment => comment.postId, '[]');
    },
    options
  );

  const usersLoader = new BatchLoader(async keys => {
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
        post.userRecord = await usersLoader.load(post.userId);
      },
      // Join 0, 1 or many comments records to posts, where comments.postId === posts.id
      async () => {
        const commentRecords = await commentsLoader.load(post.id);
        post.commentRecords = commentRecords;

        // Join one users record to comments, for comments.userId === users.id
        await map(commentRecords, async comment => {
          comment.userRecord = await usersLoader.load(comment.userId);
        });
      },
      // Join 0, 1 or many users record to posts, where posts.starIds === users.id
      async () => {
        if (!post.starIds) return null;

        post.starUserRecords = await usersLoader.loadMany(post.starIds);
      }
    ]);
  });

  return postRecords;
}
```

> Notice `usersLoader` is being called within 3 quite different joins. These joins will share their batching and cache, noticeably improving overall performance.

This example has batching and caching disabled. These 22 service calls are made when it is run. They are the same calls which a plain JavaScript implementation would have made:

```text
... posts find
... users find { id: { '$in': [ 101 ] } }
... comments find { postId: { '$in': [ 1 ] } }
... users find { id: { '$in': [ 102 ] } }
... users find { id: { '$in': [ 103 ] } }
... users find { id: { '$in': [ 104 ] } }
... users find { id: { '$in': [ 102 ] } }
... comments find { postId: { '$in': [ 2 ] } }
... users find { id: { '$in': [ 101 ] } }
... users find { id: { '$in': [ 103 ] } }
... users find { id: { '$in': [ 104 ] } }
... users find { id: { '$in': [ 103 ] } }
... comments find { postId: { '$in': [ 3 ] } }
... users find { id: { '$in': [ 104 ] } }
... comments find { postId: { '$in': [ 4 ] } }
... users find { id: { '$in': [ 102 ] } }
... users find { id: { '$in': [ 102 ] } }
... users find { id: { '$in': [ 102 ] } }
... users find { id: { '$in': [ 101 ] } }
... users find { id: { '$in': [ 101 ] } }
... users find { id: { '$in': [ 101 ] } }
... users find { id: { '$in': [ 102 ] } }
```

Now let's enable batching and caching by changing `tester({ batch: false, cache: false })` to `tester()`. Only these **three** service calls are now made to obtain the same results:

```text
... posts find
... users find { id: { '$in': [ 101, 102, 103, 104 ] } }
... comments find { postId: { '$in': [ 1, 2, 3, 4 ] } }
```

> The 2 BatchLoaders reduced the number of services calls from 22 for a plain implementation, to just 3!

The final populated result is:

```js
[
  {
    id: 1,
    body: "John post",
    userId: 101,
    starIds: [102, 103, 104],
    userRecord: { id: 101, name: "John" },
    starUserRecords: [
      { id: 102, name: "Marshall" },
      { id: 103, name: "Barbara" },
      { id: 104, name: "Aubree" },
    ],
    commentRecords: [
      {
        id: 11,
        text: "John post Marshall comment 11",
        postId: 1,
        userId: 102,
        userRecord: { id: 102, name: "Marshall" },
      },
      {
        id: 12,
        text: "John post Marshall comment 12",
        postId: 1,
        userId: 102,
        userRecord: { id: 102, name: "Marshall" },
      },
      {
        id: 13,
        text: "John post Marshall comment 13",
        postId: 1,
        userId: 102,
        userRecord: { id: 102, name: "Marshall" },
      },
    ],
  },
  {
    id: 2,
    body: "Marshall post",
    userId: 102,
    starIds: [101, 103, 104],
    userRecord: { id: 102, name: "Marshall" },
    starUserRecords: [
      { id: 101, name: "John" },
      { id: 103, name: "Barbara" },
      { id: 104, name: "Aubree" },
    ],
    commentRecords: [
      {
        id: 14,
        text: "Marshall post John comment 14",
        postId: 2,
        userId: 101,
        userRecord: { id: 101, name: "John" },
      },
      {
        id: 15,
        text: "Marshall post John comment 15",
        postId: 2,
        userId: 101,
        userRecord: { id: 101, name: "John" },
      },
    ],
  },
  {
    id: 3,
    body: "Barbara post",
    userId: 103,
    userRecord: { id: 103, name: "Barbara" },
    commentRecords: [
      {
        id: 16,
        text: "Barbara post John comment 16",
        postId: 3,
        userId: 101,
        userRecord: { id: 101, name: "John" },
      },
    ],
  },
  {
    id: 4,
    body: "Aubree post",
    userId: 104,
    userRecord: { id: 104, name: "Aubree" },
    commentRecords: [
      {
        id: 17,
        text: "Aubree post Marshall comment 17",
        postId: 4,
        userId: 102,
        userRecord: { id: 102, name: "Marshall" },
      },
    ],
  },
];
```

## See also

- [facebook/dataloader](https://github.com/facebook/dataloader) from which batch-loader is derived.
