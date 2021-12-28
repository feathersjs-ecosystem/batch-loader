<!--- Usage --------------------------------------------------------------------------------------->
<h2 id="Usage">Usage</h2>

Feathers-dataloader exports 5 classes. The easiest way to use feathers-datalaoader is to use the `AppLoader`. This is a high level class that configures and caches the lower level classes on the fly with common defaults and best practices.

```js
npm install --save @feathers-plus/batch-loader

const { AppLoader } = require('@feathers-plus/batch-loader');

const loader = new AppLoader({ app });

// Load one user with id 1
const user = await loader.service('users').load(1);
// Load one user with username "Marshall"
const user = await loader.service('users').load({ username: "Marshall" });
// Load two users user with ids 1, 2
const users = await loader.service('users').load([1, 2]);
// Load multiple comments for user with id 1
const comments = await loader.service('users').loadMulti({ user_id: 1 });
// Load multiple comments for both users 1, 2
const comments = await loader.service('users').loadMulti({ user_id: [1, 2] });

// Use params
const user = await loader.service('users').load(1, { query: { status: 'active' } });

// Get one user with id 1. Similar to .load() but does not use batching. It
// does cache results of the id/params
const user = await loader.service('users')get(1);
// Find many users. Usefule for finding records that do not have a keyed relationship. Uses
// cached results of the params
const users = await loader.service('users')find({ query: { status: 'active' } });
```

Loaders are most commonly used when resolving data onto results. This is generally done in hooks like `withResult`, `fastJoin`, and `feathers-schema`. Setup a loader in before hooks to make it available to these other hookse

```js
const { AppLoader } = require('@feathers-plus/batch-loader');

const initializeLoader = context => {
  if (context.params.loader) {
    // Allow the user to pass in a loader. This is good practice to share
    // loaders across many service calls.
    return context;
  }

  context.params.loader = new AppLoader({ app: context.app });
  return context;
}

const withResults = withResult({
  user: ({ user_id }, context) => {
    const { loader } = context.params;
    return loader.service('users').load(user_id);
  }
});

// Pass the loader to many service calls for best results
const withResults = withResults({
  user: ({ user_id }, context) => {
    const { loader } = context.params;
    return loader.service('users').load(user_id, { loader });
  }
});

```

The `AppLoader` lazily configures a new `ServiceLoader` per service as you use them. This means that you do not have to configure the lower level `ServiceLoader` classes. The `ServiceLoader` then lazily creates a `BatchLoader` (for .load() and .loadMulti() methods) and a `CacheLoader` (for .get() and .find() methods). But, you can use these classes individually, although it is generally not needed.

```js

const { BatchLoader, CacheLoader, ServiceLoader } = require('@feathers-plus/batch-loader');

// The serviceLoader gives access to all 4 methods
const serviceLoader = new ServiceLoader({ service: app.service('users') });
const user = await serviceLoader.load(1);
const users = await serviceLoader.loadMulti(1);
const user = await serviceLoader.get(1);
const users = await serviceLoader.find();

// The batchLoader gives access to .load() and .loadMulti() methods
const batchLoader = new BatchLoader({ service: app.service('users') });
const user = await batchLoader.load(1);
const users = await batchLoader.loadMulti(1);

// The cacheLoader gives access to .get() and .find() methods
const cacheLoader = new CacheLoader({ service: app.service('users') });
const user = await cacheLoader.get(1);
const users = await cacheLoader.find();

```

The `BatchLoader` configures a `DataLoader` with some basic options. The `DataLoader` is a powerful batching and caching class that dramatically imporoves performance. It is based on the [facebook/dataloader](https://github.com/facebook/dataloader). If you are interested in how this works in depth, check out this [GREAT VIDEO](https://www.youtube.com/watch?v=OQTnXNCDywA) by its original author. You should also checkout the [GUIDE](./guide.md) for a comprehensive explanation of how the `DataLoader` works.


```js
const DataLoader = require('@feathers-plus/batch-loader');
const { getResultsByKey, getUniqueKeys } = DataLoader;

const usersLoader = new DataLoader(async (keys, context) => {
    const usersRecords = await users.find({ query: { id: { $in: getUniqueKeys(keys) } } });
    return getResultsByKey(keys, usersRecords, user => user.id, '')
  },
  { context: {} }
);

const user = await usersLoader.load(key);
```

> May be used on the client.

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

- **Example**

```js
  const { AppLoader } = require("@feathers-plus/batch-loader");

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

- **Example**

```js
  const { ServiceLoader } = require("@feathers-plus/batch-loader");

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


- **Example**

```js
  const { BatchLoader } = require("@feathers-plus/batch-loader");

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


- **Example**

```js
  const { CacheLoader } = require("@feathers-plus/batch-loader");

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

Create a new batch-loader given a batch loading function and options.

- **Arguments:**
  - `{Function} batchLoadFunc`
  - `{Object} [ options ]`
    - `{Boolean} batch`
    - `{Boolean} cache`
    - `{Function} cacheKeyFn`
    - `{Object} cacheMap`
    - `{Object} context`
    - `{Number} maxBatchSize`

| Argument        |    Type    | Default | Description                                      |
| --------------- | :--------: | ------- | ------------------------------------------------ |
| `batchLoadFunc` | `Function` |         | See [Batch Function](./guide.md#batch-function). |
| `options`       |  `Object`  |         | Options.                                         |

| `options`      | Argument | Type         | Default                                                                                                                                | Description |
| -------------- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `batch`        | Boolean  | `true`       | Set to false to disable batching, invoking `batchLoadFunc` with a single load key.                                                     |
| `cache`        | Boolean  | `true`       | Set to false to disable memoization caching, creating a new Promise and new key in the `batchLoadFunc` for every load of the same key. |
| `cacheKeyFn`   | Function | `key => key` | Produces cache key for a given load key. Useful when keys are objects and two objects should be considered equivalent.                 |
| `cacheMap`     | Object   | `new Map()`  | Instance of Map (or an object with a similar API) to be used as cache. See below.                                                      |
| `context`      | Object   | `null`       | A context object to pass into `batchLoadFunc` as its second argument.                                                                  |
| `maxBatchSize` | Number   | `Infinity`   | Limits the number of keys when calling `batchLoadFunc`.                                                                                |

- **Example**

  ```js
  const DataLoader = require("@feathers-plus/batch-loader");
  const { getResultsByKey, getUniqueKeys } = DataLoader;

  const usersLoader = new DataLoader(
    async (keys, context) => {
      const data = await users.find({
        query: { id: { $in: getUniqueKeys(keys) } },
        paginate: false,
      });
      return getResultsByKey(keys, data, (user) => user.id, "");
    },
    { context: {}, batch: true, cache: true }
  );
  ```

- **Pagination**

  The number of results returned by a query using `$in` is controlled by the pagination `max` set for that Feathers service. You need to specify a `paginate: false` option to ensure that records for all the keys are returned.

  The maximum number of keys the `batchLoadFunc` is called with can be controlled by the DataLoader itself with the `maxBatchSize` option.

- **option.cacheMap**

  The default cache will grow without limit, which is reasonable for short lived batch-loaders which are rebuilt on every request. The number of records cached can be limited with a _least-recently-used_ cache:

  ```js
  const DataLoader = require('@feathers-plus/batch-loader');
  const cache = require('@feathers-plus/cache');

  const usersLoader = new DataLoader(
    keys => { ... },
    { cacheMap: cache({ max: 100 })
  );
  ```

  > You can consider wrapping npm's `lru` on the browser.

- **See also:** [Guide](./guide.md)

<!--- getUniqueKeys ------------------------------------------------------------------------------->
<h2 id="get-unique-keys">static DataLoader.getUniqueKeys( keys )</h2>

Returns the unique elements in an array.

- **Arguments:**
  - `{Array<String | Number>} keys`

| Argument | Type                           | Default | Description                       |
| -------- | ------------------------------ | ------- | --------------------------------- |
| `keys`   | `Array<` `String /` `Number >` |         | The keys. May contain duplicates. |

- **Example:**

  ```js
  const usersLoader = new DataLoader(async keys =>
    const data = users.find({ query: { id: { $in: getUniqueKeys(keys) } } })
    ...
  );
  ```

- **Details**

  The array of keys may contain duplicates when the batch-loader's memoization cache is disabled.

  <p class="tip">Function does not handle keys of type Object nor Array.</p>

<!--- getResultsByKey ----------------------------------------------------------------------------->
<h2 id="get-results-by-key">static DataLoader.getResultsByKey( keys, records, getRecordKeyFunc, type [, options] )</h2>

Reorganizes the records from the service call into the result expected from the batch function.

- **Arguments:**
  - `{Array<String | Number>} keys`
  - `{Array<Object>} records`
  - `{Function} getRecordKeyFunc`
  - `{String} type`
  - `{Object} [ options ]`
    - `{null | []} defaultElem`
    - `{Function} onError`

| Argument           |             Type              | Default | Description                                                                                                   |
| ------------------ | :---------------------------: | ------- | ------------------------------------------------------------------------------------------------------------- |
| `keys`             | `Array<` `String /` `Number>` |         | An array of `key` elements, which the value the batch loader function will use to find the records requested. |
| `records`          |     `Array< ` `Object >`      |         | An array of records which, in total, resolve all the `keys`.                                                  |
| `getRecordKeyFunc` |          `Function`           |         | See below.                                                                                                    |
| `type`             |           `String`            |         | The type of value the batch loader must return for each key.                                                  |
| `options`          |           `Object`            |         | Options.                                                                                                      |

| `type`   |                      Value                       | Description |
| -------- | :----------------------------------------------: | ----------- |
| `''`     |            An optional single record.            |
| `'!'`    |            A required single record.             |
| `'[]'`   | A required array including 0, 1 or more records. |
| `'[]!'`  |                 Alias of `'[]'`                  |
| `'[!]'`  |  A required array including 1 or more records.   |
| `'[!]!'` |                 Alias of `'[!]'`                 |

| `options`     | Argument      |       Type       | Default                                                                                        | Description |
| ------------- | ------------- | :--------------: | ---------------------------------------------------------------------------------------------- | ----------- |
| `defaultElem` | `{null / []}` |      `null`      | The value to return for a `key` having no record(s).                                           |
| `onError`     | `Function`    | `(i, msg) => {}` | Handler for detected errors, e.g. `(i, msg) =>` `{ throw new Error(msg,` `'on element', i); }` |

- **Example**

  ```js
  const usersLoader = new DataLoader(async (keys) => {
    const data = users.find({ query: { id: { $in: getUniqueKeys(keys) } } });
    return getResultsByKey(keys, data, (user) => user.id, "", {
      defaultElem: [],
    });
  });
  ```

- **Details**

  <p class="tip">Function does not handle keys of type Object nor Array.</p>

- **getRecordKeyFunc**

  A function which, given a record, returns the key it satisfies, e.g.

  ```js
  (user) => user.id;
  ```

- **See also:** [Batch-Function](./guide.md#Batch-Function)

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

- **Example**

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
