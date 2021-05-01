## Creating a new batch-loader per Request.

In many applications, a server using batch-loader serves requests to many different users with different access permissions. It may be dangerous to use one cache across many users, and it is encouraged to create a new batch-loader per request:

```js
function createLoaders(authToken) {
  return {
    users: new BatchLoader((ids) => genUsers(authToken, ids)),
    cdnUrls: new BatchLoader((rawUrls) => genCdnUrls(authToken, rawUrls)),
    stories: new BatchLoader((keys) => genStories(authToken, keys)),
  };
}

// When handling an incoming request:
var loaders = createLoaders(request.query.authToken);

// Then, within application logic:
var user = await loaders.users.load(4);
var pic = await loaders.cdnUrls.load(user.rawPicUrl);
```

## Loading by alternative keys.

Occasionally, some kind of value can be accessed in multiple ways. For example, perhaps a "User" type can be loaded not only by an "id" but also by a "username" value. If the same user is loaded by both keys, then it may be useful to fill both caches when a user is loaded from either source:

```js
let userByIDLoader = new BatchLoader((ids) =>
  genUsersByID(ids).then((users) => {
    for (let user of users) {
      usernameLoader.prime(user.username, user);
    }
    return users;
  })
);

let usernameLoader = new BatchLoader((names) =>
  genUsernames(names).then((users) => {
    for (let user of users) {
      userByIDLoader.prime(user.id, user);
    }
    return users;
  })
);
```

## Persistent caches

By default, batch-loader uses the standard Map which simply grows until the batch-loader is released. A custom cache is provided as a convenience if you want to persist caches for longer periods of time. It implements a **least-recently-used** algorithm and allows you to limit the number of records cached.

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const cache = require('@feathers-plus/cache');

const usersLoader = new BatchLoader(
  keys => { ... },
  { cacheMap: cache({ max: 100 })
);
```

<p class="tip">The default cache is appropriate when requests to your application are short-lived.</p>

## Using non-Feathers services

batch-loader provides a simplified and consistent API over various data sources, when its used as part of your application's data fetching layer. Custom Feathers services can use batch-loaders to natively accesses local and remote resources.

### Redis

Redis is a very simple key-value store which provides the batch load method MGET which makes it very well suited for use with batch-loader.

```js
const BatchLoader = require("@feathers-plus/batch-loader");
const redis = require("redis");

const client = redis.createClient();

const redisLoader = new BatchLoader(
  (keys) =>
    new Promise((resolve, reject) => {
      client.mget(keys, (error, results) => {
        if (error) return reject(error);

        resolve(
          results.map((result, index) =>
            result !== null ? result : new Error(`No key: ${keys[index]}`)
          )
        );
      });
    })
);
```

### SQLite

While not a key-value store, SQL offers a natural batch mechanism with SELECT \* WHERE IN statements. While batch-loader is best suited for key-value stores, it is still suited for SQL when queries remain simple. This example requests the entire row at a given id, however your usage may differ.

This example uses the sqlite3 client which offers a parallelize method to further batch queries together. Another non-caching batch-loader utilizes this method to provide a similar API. batch-loaders can access other batch-loaders.

```js
const BatchLoader = require("@feathers-plus/batch-loader");
const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("./to/your/db.sql");

// Dispatch a WHERE-IN query, ensuring response has rows in correct order.
const userLoader = new BatchLoader((ids) => {
  const params = ids.map((id) => "?").join();
  const query = `SELECT * FROM users WHERE id IN (${params})`;
  return queryLoader
    .load([query, ids])
    .then((rows) =>
      ids.map(
        (id) =>
          rows.find((row) => row.id === id) || new Error(`Row not found: ${id}`)
      )
    );
});

// Parallelize all queries, but do not cache.
const queryLoader = new BatchLoader(
  (queries) =>
    new Promise((resolve) => {
      const waitingOn = queries.length;
      const results = [];
      db.parallelize(() => {
        queries.forEach((query, index) => {
          db.all.apply(
            db,
            query.concat((error, result) => {
              results[index] = error || result;
              if (--waitingOn === 0) {
                resolve(results);
              }
            })
          );
        });
      });
    }),
  { cache: false }
);

// Usage

const promise1 = userLoader.load("1234");
const promise2 = userLoader.load("5678");

Promise.all([promise1, promise2]).then(([user1, user2]) => {
  console.log(user1, user2);
});
```

### Knex.js

This example demonstrates how to use batch-loader with SQL databases via Knex.js, which is a SQL query builder and a client for popular databases such as PostgreSQL, MySQL, MariaDB etc.

```js
const BatchLoader = require("@feathers-plus/batch-loader");
const db = require("./db"); // an instance of Knex client

// The list of batch loaders

const batchLoader = {
  user: new BatchLoader((ids) =>
    db
      .table("users")
      .whereIn("id", ids)
      .select()
      .then((rows) => ids.map((id) => rows.find((x) => x.id === id)))
  ),

  story: new BatchLoader((ids) =>
    db
      .table("stories")
      .whereIn("id", ids)
      .select()
      .then((rows) => ids.map((id) => rows.find((x) => x.id === id)))
  ),

  storiesByUserId: new BatchLoader((ids) =>
    db
      .table("stories")
      .whereIn("author_id", ids)
      .select()
      .then((rows) => ids.map((id) => rows.filter((x) => x.author_id === id)))
  ),
};

// Usage

Promise.all([
  batchLoader.user.load("1234"),
  batchLoader.storiesByUserId.load("1234"),
]).then(([user, stories]) => {
  /* ... */
});
```

### RethinkDB

Full implementation:

```js
const BatchLoader = require("@feathers-plus/batch-loader");
const r = require("rethinkdb");
const db = await r.connect();

const batchLoadFunc = (keys) =>
  db
    .table("example_table")
    .getAll(...keys)
    .then((res) => res.toArray())
    .then(normalizeRethinkDbResults(keys, "id"));

const exampleLoader = new BatchLoader(batchLoadFunc);

await exampleLoader.loadMany([1, 2, 3]); // [{"id": 1, "name": "Document 1"}, {"id": 2, "name": "Document 2"}, Error];

await exampleLoader.load(1); // {"id": 1, "name": "Document 1"}

function indexResults(results, indexField, cacheKeyFn = (key) => key) {
  const indexedResults = new Map();
  results.forEach((res) => {
    indexedResults.set(cacheKeyFn(res[indexField]), res);
  });
  return indexedResults;
}

function normalizeRethinkDbResults(
  keys,
  indexField,
  cacheKeyFn = (key) => key
) {
  return (results) => {
    const indexedResults = indexResults(results, indexField, cacheKeyFn);
    return keys.map(
      (val) =>
        indexedResults.get(cacheKeyFn(val)) ||
        new Error(`Key not found : ${val}`)
    );
  };
}
```
