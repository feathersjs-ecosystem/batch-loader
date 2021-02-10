<!--- Usage --------------------------------------------------------------------------------------->
<h2 id="Usage">Usage</h2>

```js
npm install --save @feathers-plus/batch-loader

// JS
const BatchLoader = require('@feathers-plus/batch-loader');
const { getResultsByKey, getUniqueKeys } = BatchLoader;

const usersLoader = new BatchLoader(async (keys, context) => {
    const usersRecords = await users.find({ query: { id: { $in: getUniqueKeys(keys) } } });
    return getResultsByKey(keys, usersRecords, user => user.id, '')
  },
  { context: {} }
);

const user = await usersLoader.load(key);
```

> May be used on the client.

<!--- class BatchLoader --------------------------------------------------------------------------->
<h2 id="class-batchloader">class BatchLoader( batchLoadFunc [, options] )</h2>

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
  const BatchLoader = require("@feathers-plus/batch-loader");
  const { getResultsByKey, getUniqueKeys } = BatchLoader;

  const usersLoader = new BatchLoader(
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

  The maximum number of keys the `batchLoadFunc` is called with can be controlled by the BatchLoader itself with the `maxBatchSize` option.

- **option.cacheMap**

  The default cache will grow without limit, which is reasonable for short lived batch-loaders which are rebuilt on every request. The number of records cached can be limited with a _least-recently-used_ cache:

  ```js
  const BatchLoader = require('@feathers-plus/batch-loader');
  const cache = require('@feathers-plus/cache');

  const usersLoader = new BatchLoader(
    keys => { ... },
    { cacheMap: cache({ max: 100 })
  );
  ```

  > You can consider wrapping npm's `lru` on the browser.

- **See also:** [Guide](./guide.md)

<!--- getUniqueKeys ------------------------------------------------------------------------------->
<h2 id="get-unique-keys">static BatchLoader.getUniqueKeys( keys )</h2>

Returns the unique elements in an array.

- **Arguments:**
  - `{Array<String | Number>} keys`

| Argument | Type                           | Default | Description                       |
| -------- | ------------------------------ | ------- | --------------------------------- |
| `keys`   | `Array<` `String /` `Number >` |         | The keys. May contain duplicates. |

- **Example:**

  ```js
  const usersLoader = new BatchLoader(async keys =>
    const data = users.find({ query: { id: { $in: getUniqueKeys(keys) } } })
    ...
  );
  ```

- **Details**

  The array of keys may contain duplicates when the batch-loader's memoization cache is disabled.

  <p class="tip">Function does not handle keys of type Object nor Array.</p>

<!--- getResultsByKey ----------------------------------------------------------------------------->
<h2 id="get-results-by-key">static BatchLoader.getResultsByKey( keys, records, getRecordKeyFunc, type [, options] )</h2>

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

| `type` |                      Value                       | Description |
| ------ | :----------------------------------------------: | ----------- |
| `''`   |            An optional single record.            |
| `'!'`  |            A required single record.             |
| `'[]'` | A required array including 0, 1 or more records. |

| `options`     | Argument      |       Type       | Default                                                                                        | Description |
| ------------- | ------------- | :--------------: | ---------------------------------------------------------------------------------------------- | ----------- |
| `defaultElem` | `{null / []}` |      `null`      | The value to return for a `key` having no record(s).                                           |
| `onError`     | `Function`    | `(i, msg) => {}` | Handler for detected errors, e.g. `(i, msg) =>` `{ throw new Error(msg,` `'on element', i); }` |

- **Example**

  ```js
  const usersLoader = new BatchLoader(async (keys) => {
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
  const batchLoader = new BatchLoader( ... );
  const user = await batchLoader.load(key);
  ```

<!--- loadMany ------------------------------------------------------------------------------------>
<h2 id="loadmany">batchLoader.loadMany( keys )</h2>

Loads multiple keys, promising a arrays of values.

- **Arguments**
  - `{Array<String | Number | Object | Array>} keys`

| Argument |                         Type                          | Default | Description                                          |
| -------- | :---------------------------------------------------: | ------- | ---------------------------------------------------- |
| `keys`   | `Array<` `String /` ` Number /` ` Object /` ` Array>` |         | The keys the batch-loader will return result(s) for. |

- **Example**

  ```js
  const usersLoader = new BatchLoader( ... );
  const users = await usersLoader.loadMany([ key1, key2 ]);
  ```

- **Details**

  This is a convenience method. `usersLoader.loadMany([ key1, key2 ])` is equivalent to the more verbose:

  ```js
  Promise.all([usersLoader.load(key1), usersLoader.load(key2)]);
  ```

<!--- clear --------------------------------------------------------------------------------------->
<h2 id="clear">batchLoader.clear( key )</h2>

Clears the value at key from the cache, if it exists.

- **Arguments:**
  - `{String | Number | Object | Array} key`

| Argument |                Type                | Default | Description                       |
| -------- | :--------------------------------: | ------- | --------------------------------- |
| `key`    | `String` `Number` `Object` `Array` |         | The key to remove from the cache. |

- **Details**

The key is matches using strict equality. This is particularly important for `Object` and `Array` keys.

<!--- clearAll ------------------------------------------------------------------------------------>
<h2 id="clearall">batchLoader.clearAll()</h2>

Clears the entire cache.

- **Details**

  To be used when some event results in unknown invalidations across this particular batch-loader.

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
