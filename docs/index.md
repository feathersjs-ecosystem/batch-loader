<!--- Usage --------------------------------------------------------------------------------------->
<h2 id="Usage">Usage</h2>

Feathers-dataloader exports 5 classes. The easiest way to use feathers-datalaoader is to use the `AppLoader`. This is a high level class that configures and caches the lower level classes on the fly with common defaults and best practices.

```js
npm install --save feathers-dataloader

const { AppLoader } = require('feathers-dataloader');

const loader = new AppLoader({ app });

// Load one user with id 1
const user = await loader.service('users').load({ id: 1 });
// Load one user with username "Marshall"
const user = await loader.service('users').load({ username: "Marshall" });
// Load two users with ids 1, 2
const users = await loader.service('users').load({ id: [1, 2] });

// Load multiple comments for user with id 1
const comments = await loader.service('comments').loadMulti({ userId: 1 });
// Load multiple comments for both users 1, 2
const comments = await loader.service('comments').loadMulti({ userId: [1, 2] });

// Use params
const user = await loader.service('users').load({ id: 1 }, { query: { status: 'active' } });

// Get one user with id 1. Similar to .load() but does not use batching and uses a
// regular .get(). It does cache results of the id/params
const user = await loader.service('users')get(1);
// Find many users. Useful for finding records that do not have a keyed relationship,
// but can still benefit from caching. Uses cached results of the params
const users = await loader.service('users')find({ query: { status: 'active' } });
```

Loaders are most commonly used when resolving data onto results. This is generally done in hooks like `@feathers-/schema`, `withResult`, or `fastJoin`. Setup a loader in before hooks to make it available to these other hooks.

```js
const { AppLoader } = require('feathers-dataloader');


// Use app.hooks() to initiliaze or pass on a loader
// with each service request. This ensures there is
// always params.loader available in subsequent hooks.
const initializeLoader = context => {
  if (context.params.loader) {
    return context;
  }

  context.params.loader = new AppLoader({ app: context.app });
  return context;
}

app.hooks({
  before: {
    all: [initializeLoader]
  }
});
```

Now loaders are available everywhere! No need to instantiate or configure a `ServiceLoader` for each service ahead of time. `ServiceLoader` are lazily created and cached as they are called. It is also best practice to pass the loader onto susequent service/loader calls to maximize effeciency. See the [Common Patterns](./docs/common-patterns.md) section for more info.

```js
const { resolveResult, resolve } = require('@feathersjs/schema');

const postResultsResolver = resolve({
  properties: {
    user: (value, post, context) => {
      const { loader } = context.params;
      return loader.service('users').load({ id: post.userId }, { loader });
    }
  }
});

app.service('posts').hooks({
  after: {
    all: [resolveResult(postResultsResolver)]
  }
});
```

The `AppLoader` lazily configures a new `ServiceLoader` per service as you use them. This means that you do not have to configure the lower level `ServiceLoader` classes. The `ServiceLoader` then lazily creates a `BatchLoader` (for .load() and .loadMulti() methods) and a `CacheLoader` (for .get() and .find() methods). But, you can use these classes individually, although it is generally not needed.

```js

const { BatchLoader, CacheLoader, ServiceLoader } = require('feathers-dataloader');

// The serviceLoader gives access to all 4 methods
const serviceLoader = new ServiceLoader({ service: app.service('users') });
const user = await serviceLoader.load({ id: 1 });
const users = await serviceLoader.loadMulti({ id: 1 });
const user = await serviceLoader.get(1);
const users = await serviceLoader.find();

// The batchLoader gives access to .load() and .loadMulti() methods
const batchLoader = new BatchLoader({ service: app.service('users') });
const user = await batchLoader.load({ id: 1 });
const users = await batchLoader.loadMulti({ id: 1 });

// The cacheLoader gives access to .get() and .find() methods
const cacheLoader = new CacheLoader({ service: app.service('users') });
const user = await cacheLoader.get(1);
const users = await cacheLoader.find();

```

The `BatchLoader` configures a `DataLoader` with some basic options. The `DataLoader` is a powerful batching and caching class that dramatically imporoves performance. It is based on the [facebook/dataloader](https://github.com/facebook/dataloader). If you are interested in how this works in depth, check out this [GREAT VIDEO](https://www.youtube.com/watch?v=OQTnXNCDywA) by its original author. You should also checkout the [GUIDE](./guide.md) for a comprehensive explanation of how the `DataLoader` works.


```js
const { DataLoader, uniqueKeys, uniqueResults } = require('feathers-dataloader');

const usersLoader = new DataLoader(async (keys) => {
    const results = await users.find({ query: { id: { $in: uniqueKeys(keys) } } });
    return uniqueResults(keys, results);
  }
);

const user = await usersLoader.load({ id: 1 });
```

<!--- class AppLoader --------------------------------------------------------------------------->
<h2 id="class-apploader">class AppLoader( [, options] )</h2>

Create a new app-loader. This is the most commonly used class.

- **Arguments:**
  - `{Object} [ options ]`
    - `{Object} app`
    - `{Object} cacheMap`
    - `{Object} serviceOptions`

| Argument        |    Type    |   Default  | Description                                      |
| --------------- | :--------: | ---------- | ------------------------------------------------ |
| `app`           | `Object`   |            | A feathers app                                   |
| `cacheMap`      |  `Object`  | `new Map()`| Instance of Map (or an object with a similar API) to be used as cache. This caches each `ServiceLoader` per service name |
| `serviceOptions`           | `Object`   |      {}      | An object where each key is a service name and holds `batchOptions` for a `BatchLoader` and `cacheOptions` for a `CacheLoader`                                 |

```js
  const { AppLoader } = require("feathers-dataloader");

  const loader = new AppLoader({
    app,
    cacheMap: new Map(),
    serviceOptions: {
      users: {
        batchOptions: { ... }, // See BatchLoader
        cacheOptions: { ... } // See CacheLoader
      }
    }
  });

```

<!--- class ServiceLoader --------------------------------------------------------------------------->
<h2 id="class-serviceloader">class ServiceLoader( [, options] )</h2>

Create a new service-loader. This class lazily configures underlying `BatchLoader` and `CacheLoader` for a given service

- **Arguments:**
  - `{Object} [ options ]`
    - `{Object} service`
    - `{Object} batchOptions`
    - `{Object} cacheOptions`

| Argument        |    Type    |   Default  | Description                                      |
| --------------- | :--------: | ---------- | ------------------------------------------------ |
| `service`           | `Object`   |            | A service for this loader. For example, `app.service('users')`                                   |
| `batchOptions`      |  `Object`  | {} | See `BatchLoader` |
| `cacheOptions`           | `Object`   |      {}      | See `CacheLoader`                                 |


```js
  const { ServiceLoader } = require("feathers-dataloader");

  const loader = new ServiceLoader({
    service: app.service('users'),
    batchOptions: { ... }, // See BatchLoader
    cacheOptions: { ... } // See CacheLoader
  });

```

<!--- class BatchLoader --------------------------------------------------------------------------->
<h2 id="class-batchloader">class BatchLoader( [, options] )</h2>

Create a new batch-loader. This class lazily configures underlying `DataLoader` for this service

- **Arguments:**
  - `{Object} [ options ]`
    - `{Object} service`
    - `{Object} cacheMap`
    - `{Function} cacheParamsFn`
    - `{Object} loaderOptions`

| Argument        |    Type    |   Default  | Description                                      |
| --------------- | :--------: | ---------- | ------------------------------------------------ |
| `service`           | `Object`   |            | A service for this loader. For example, `app.service('users')`                                   |
| `cacheMap`      |  `Object`  | `new Map()`| Instance of Map (or an object with a similar API) to be used as cache. This caches different `DataLoaders` per id/params combination |
| `cacheParamsFn`           | `Function`   |      defaultCacheParamsFn      | A function that returns JSON.strinify-able params of a query to be used in the `cacheMap`. This function should return a set of params that will be used to identify this unique query and removes any non-serializable items. The default function returns params with query, user, authentication, and paginate.
| `loaderOptions`      |  `Object`  | {} | See `DataLoader` |


```js
  const { BatchLoader } = require("feathers-dataloader");

  const loader = new BatchLoader({
    service: app.service('users'),
    cacheMap: new Map(),
    cacheParamsFn: (params) => {
      return {
        paginate: false,
        query: params.query,
        user_id: params.user.id
      }
    }
    loaderOptions: { ... } // See DataLoader
  });

```

<!--- class CacheLoader --------------------------------------------------------------------------->
<h2 id="class-cacheloader">class CacheLoader( [, options] )</h2>

Create a new cache-loader. Create a loader that caches `get()` and `find()` queries based on their id/params

- **Arguments:**
  - `{Object} [ options ]`
    - `{Object} service`
    - `{Object} cacheMap`
    - `{Function} cacheParamsFn`
    - `{cacheKeyFn} cacheKeyFn`

| Argument        |    Type    |   Default  | Description                                      |
| --------------- | :--------: | ---------- | ------------------------------------------------ |
| `service`           | `Object`   |            | A service for this loader. For example, `app.service('users')`                                   |
| `cacheMap`      |  `Object`  | `new Map()`| Instance of Map (or an object with a similar API) to be used as cache. This caches the results of `get()` and `find()` methods based on their ids/params. |
| `cacheParamsFn`           | `Function`   |      defaultCacheParamsFn      | A function that returns JSON.strinify-able params of a query to be used in the `cacheMap`. This function should return a set of params that will be used to identify this unique query and removes any non-serializable items. The default function returns params with query, user, authentication, and paginate.
| `cacheKeyFn`      |  `Function`  | defaultCacheKeyFn | Normalize keys. `(key) => key && key.toString ? key.toString() : String(key)` |


```js
  const { CacheLoader } = require("feathers-dataloader");

  const loader = new CacheLoader({
    service: app.service('users'),
    cacheMap: new Map(),
    cacheParamsFn: (params) => {
      return {
        paginate: false,
        query: params.query,
        user_id: params.user.id
      }
    }
    cacheKeyFn: (key) => key
  });

```


<!--- class DataLoader --------------------------------------------------------------------------->
<h2 id="class-dataloader">class DataLoader( batchLoadFunc [, options] )</h2>

This library re-exports [Dataloader](https://www.npmjs.com/package/dataloader) from its original package. Please see its documentation for more information. `loaderOptions` given to `BatchLoader` will be used to configure Dataloaders. You can also import `Dataloader` along with some helpful utility functions to build custom loaders.

  ```js
  const { DataLoader uniqueResults, uniqueKeys } = require("feathers-dataloader");

  const batchFn = async (keys, context) => {
    const data = await users.find({
      query: { id: { $in: uniqueKeys(keys) } },
      paginate: false,
    });
    return uniqueResults(keys, data);
  }

  const usersLoader = new DataLoader(
    batchFn,
    {
      batch: true,
      cache: true,
      maxBatchSize: 100,
      cacheKeyFn: (key) => key,
      cacheMap: new Map()
    }
  );
  ```

<!--- uniqueKeys ------------------------------------------------------------------------------->
<h2 id="unique-keys">uniqueKeys(keys)</h2>

Returns the unique elements in an array.

- **Arguments:**
  - `{Array<String | Number>} keys`

| Argument | Type                           | Default | Description                       |
| -------- | ------------------------------ | ------- | --------------------------------- |
| `keys`   | `Array<` `String /` `Number >` |         | The keys. May contain duplicates. |

- **Example:**

  ```js
  const usersLoader = new DataLoader(async keys =>
    const data = users.find({ query: { id: { $in: uniqueKeys(keys) } } })
    ...
  );
  ```

<!--- getResultsByKey ----------------------------------------------------------------------------->
<h2 id="get-results-by-key">uniqueRecords(keys, result, idProp = 'id', defaultValue = null)</h2>

Reorganizes the records from the service call into the result expected from the batch function.

- **Arguments:**
  - `{Array<String | Number>} keys`
  - `{Object | Array<Object>} result`
  - `{String} idProp`
  - `{Any} defaultValue`

| Argument           |             Type              | Default | Description                                                                                                   |
| ------------------ | :---------------------------: | ------- | ------------------------------------------------------------------------------------------------------------- |
| `keys`             | `Array<` `String /` `Number>` |         | An array of `key` elements, which the value the batch loader function will use to find the records requested. |
| `result`          |     `Array< ` `Object >`      |         | Any service method result.                                                  |
| `idProp` |          `String`           |         | The "id" property of the records.                                                                                                    |
| `defaultValue`             |           `Any`            |         | The default value returned when there is no result matching a key.                                                  |


  ```js
  const usersLoader = new DataLoader(async (keys) => {
    const data = users.find({ query: { id: { $in: uniqueKeys(keys) } } });
    return uniqueResults(keys, data, (user) => user.id, "", {
      defaultElem: [],
    });
  });
  ```

<!--- load ---------------------------------------------------------------------------------------->
<h2 id="load">batchLoader.load( key )</h2>

Loads a key, returning a Promise for the value represented by that key.

- **Arguments:**
  - `{String | Number | Object | Array} key`

| Argument |                Type                | Default | Description                                          |
| -------- | :--------------------------------: | ------- | ---------------------------------------------------- |
| `key`    | `String` `Number` `Object` `Array` |         | The key the batch-loader uses to find the result(s). |

- **Example:**

  ```js
  const dataLoader = new DataLoader( ... );
  const user = await dataLoader.load(key);
  ```

<!--- loadMany ------------------------------------------------------------------------------------>
<h2 id="loadmany">dataLoader.loadMany( keys )</h2>

Loads multiple keys, promising a arrays of values.

- **Arguments**
  - `{Array<String | Number | Object | Array>} keys`

| Argument |                         Type                          | Default | Description                                          |
| -------- | :---------------------------------------------------: | ------- | ---------------------------------------------------- |
| `keys`   | `Array<` `String /` ` Number /` ` Object /` ` Array>` |         | The keys the batch-loader will return result(s) for. |


  ```js
  const usersLoader = new DataLoader( ... );
  const users = await usersLoader.loadMany([ key1, key2 ]);
  ```

- **Details**

  This is a convenience method. `usersLoader.loadMany([ key1, key2 ])` is equivalent to the more verbose:

  ```js
  Promise.all([usersLoader.load(key1), usersLoader.load(key2)]);
  ```

<!--- clear --------------------------------------------------------------------------------------->
<h2 id="clear">batchLoader.clear( key )</h2>

Clears the value at key from the cache, if it exists. Clears the whole cache if no key is provided.

- **Arguments:**
  - `{String | Number | Object | Array} key`

| Argument |                Type                | Default | Description                       |
| -------- | :--------------------------------: | ------- | --------------------------------- |
| `key`    | `String` `Number` `Object` `Array` |         | The key to remove from the cache. |

- **Details**

The key is matched using strict equality. This is particularly important for `Object` and `Array` keys.

<!--- prime --------------------------------------------------------------------------------------->
<h2 id="prime">batchLoader.prime( key, value )</h2>

Primes the cache with the provided key and value.

- **Arguments:**
  - `{String | Number | Object | Array} key`
  - `{Object} record`

| Argument |                Type                | Default | Description                          |
| -------- | :--------------------------------: | ------- | ------------------------------------ |
| `key`    | `String` `Number` `Object` `Array` |         | The key in the cache for the record. |
| `record` |              `Object`              |         | The value for the `key`.             |

- **Details**

  **If the key already exists, no change is made.** To forcefully prime the cache, clear the key first with `batchloader.clear(key)`.
