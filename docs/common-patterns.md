## Reusing loaders

Pass the loader to any and all service calls. This maximizes performance by allowing the loader to re-use its cache and batching mechanism as much as possible. If you are using Feathers v5, you can also use Node's `AsyncLocalStorage` mechanism to automatically pass the loader from service to service.

```js
const { AppLoader } = require('feathers-dataloader');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const initializeLoader = async (context, next) => {
  if (context.params.loader) {
    return next();
  }

  const store = asyncLocalStorage.getStore();

  if (store.loader) {
    context.params.loader = store.loader;
    return next();
  }

  const loader = new AppLoader({ app: context.app });

  asyncLocalStorage.run({ loader }, async () => {
    context.params.loader = loader;
    next();
  });
};

app.hooks({
  before: {
    all: [initializeLoader]
  }
})

// No need to manually pass the loader because AsyncLocalStorage
// in the initializeLoader functions automatically passes it.
const withResults = withResults({
  user: (post, context) => {
    const { loader } = context.params;
    return loader.service('users').load(post.userId);
  }
});

app.service('posts').hooks({
  after: {
    all: [withResults]
  }
});
```

## Use loaders EVERYWHERE

The more the loader is used, the better performance can be. This is generally accomplished by passing the loader from service to service in hooks and resolvers. But, you can use loaders in other places which will also lead to performance gains.

```js
const validateUserId = async (context) => {
  const { loader } = context.params;
  const { userId } = context.data;

  // Note we use the loader to lookup this user
  const user = await loader.service('users').load(userId);

  if (!user) {
    throw new Error('Invalid userId');
  }

  return context;
};

const withResults = withResults({
  user: (post, context) => {
    const { loader } = context.params;

    // We get user for free here! The loader is already cached
    // because we used it in the validateUserId hook
    return loader.service('users').load(post.userId);
  }
});

app.service('posts').hooks({
  before: {
    create: [validateUserId],
    update: [validateUserId],
    patch: [validateUserId],
  }
  after: {
    all: [withResults]
  }
});
```

## Loading by alternative keys.

Occasionally, some kind of value can be accessed in multiple ways. For example, perhaps a "User" type can be loaded not only by an "id" but also by a "username" value. If the same user is loaded by both keys, then it may be useful to fill both caches when a user is loaded from either source:

```js
let userByIDLoader = new DataLoader((ids) =>
  genUsersByID(ids).then((users) => {
    for (let user of users) {
      usernameLoader.prime(user.username, user);
    }
    return users;
  })
);

let usernameLoader = new DataLoader((names) =>
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
const { DataLoader } = require('feathers-dataloader');
const cache = require('@feathers-plus/cache');

const usersLoader = new DataLoader(
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
const { DataLoader } = require("feathers-dataloader");
const redis = require("redis");

const client = redis.createClient();

const redisLoader = new DataLoader(
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
const { DataLoader } = require("feathers-dataloader");
const sqlite3 = require("sqlite3");

const db = new sqlite3.Database("./to/your/db.sql");

// Dispatch a WHERE-IN query, ensuring response has rows in correct order.
const userLoader = new DataLoader((ids) => {
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
const queryLoader = new DataLoader(
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
const { DataLoader } = require("feathers-dataloader");
const db = require("./db"); // an instance of Knex client

// The list of batch loaders

const batchLoader = {
  user: new DataLoader((ids) =>
    db
      .table("users")
      .whereIn("id", ids)
      .select()
      .then((rows) => ids.map((id) => rows.find((x) => x.id === id)))
  ),

  story: new DataLoader((ids) =>
    db
      .table("stories")
      .whereIn("id", ids)
      .select()
      .then((rows) => ids.map((id) => rows.find((x) => x.id === id)))
  ),

  storiesByUserId: new DataLoader((ids) =>
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
const { DataLoader } = require("feathers-dataloader");
const r = require("rethinkdb");
const db = await r.connect();

const batchLoadFunc = (keys) =>
  db
    .table("example_table")
    .getAll(...keys)
    .then((res) => res.toArray())
    .then(normalizeRethinkDbResults(keys, "id"));

const exampleLoader = new DataLoader(batchLoadFunc);

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
