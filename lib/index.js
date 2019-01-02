
const { nextTick } = require('process');

const resultTypes = {
  '[!]!': { collection: true, elemReqd: true },
  '[!]': { collection: true, elemReqd: true },
  '[]!': { collection: true, elemReqd: false },
  '[]': { collection: true, elemReqd: false },
  '!': { collection: false, elemReqd: true },
  '': { collection: false, elemReqd: false }
};

let resolvedPromise;

const BatchLoader1 = module.exports = class BatchLoader {
  constructor (batchLoadFn, options) {
    if (typeof batchLoadFn !== 'function') {
      throw new Error([
        'BatchLoader must be constructed with a function which accepts',
        `Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}. (BatchLoader)`
      ].join(' '));
    }

    this._batchLoadFn = batchLoadFn;
    this._options = options;
    this._promiseCache = getValidCacheMap(options);
    this._queue = [];
    this._context = options && options.context;
  }

  load (key) {
    if (key === undefined) {
      throw new Error(
        `batchLoader.load() must be called with a value, but got: ${String(key)} (BatchLoader).`
      );
    }

    if (Array.isArray(key)) {
      throw new Error(
        'batchLoader.load() called with an array. batchLoader.loadMany() must be used. (BatchLoader).'
      );
    }

    const options = this._options;
    const shouldBatch = !options || options.batch !== false;
    const shouldCache = !options || options.cache !== false;
    const cacheKeyFn = options && options.cacheKeyFn;
    const cacheKey = cacheKeyFn ? cacheKeyFn(key) : key;

    if (shouldCache) {
      const cachedPromise = this._promiseCache.get(cacheKey);
      if (cachedPromise) return cachedPromise;
    }

    const promise = new Promise((resolve, reject) => {
      this._queue.push({ key, resolve, reject });

      if (this._queue.length === 1) {
        if (shouldBatch) {
          enqueuePostPromiseJob(() => dispatchQueue(this, this._context));
        } else {
          dispatchQueue(this, this._context);
        }
      }
    });

    if (shouldCache) {
      this._promiseCache.set(cacheKey, promise);
    }

    return promise;
  }

  loadMany (keys) {
    if (!Array.isArray(keys)) {
      throw new Error(
      `batchLoader.loadMany must be called with an array but got: ${keys}. (BatchLoader)`
    );
    }

    return Promise.all(keys.map(key => this.load(key)));
  }

  clear (key) {
    const cacheKeyFn = this._options && this._options.cacheKeyFn;
    const cacheKey = cacheKeyFn ? cacheKeyFn(key) : key;
    this._promiseCache.delete(cacheKey);
    return this;
  }

  clearAll () {
    this._promiseCache.clear();
    return this;
  }

  prime (key, value) {
    const cacheKeyFn = this._options && this._options.cacheKeyFn;
    const cacheKey = cacheKeyFn ? cacheKeyFn(key) : key;

    if (this._promiseCache.get(cacheKey) === undefined) {
      const promise = value instanceof Error // Match behavior of load(key).
        ? Promise.reject(value)
        : Promise.resolve(value);

      this._promiseCache.set(cacheKey, promise);
    }

    return this;
  }

  static getResultsByKey (keys, resultArray, serializeRecordKey, resultType, options = {}) {
    const { onError = () => {}, defaultElem = null } = options;

    const getRecKey = typeof serializeRecordKey === 'function'
      ? serializeRecordKey : record => record[serializeRecordKey].toString();

    if (!resultTypes[resultType]) {
      onError(null, `Invalid resultType option in dataLoaderAlignResults.`);
    }

    const { collection, elemReqd } = resultTypes[resultType];

    if (resultArray === null || resultArray === undefined) resultArray = [];
    if (typeof resultArray === 'object' && !Array.isArray(resultArray)) resultArray = [resultArray];

    // hash = { '1': {id: 1, bar: 10} } or { '1': [{id: 1, bar: 10}, {id: 1, bar: 11}], 2: [{id: 2, bar: 12}] }
    const hash = Object.create(null);

    resultArray.forEach((obj, i) => {
      if (!obj && elemReqd) {
        onError(i, `This result requires a non-null result.`);
      }

      const recKey = getRecKey(obj);

      if (!hash[recKey]) hash[recKey] = [];
      hash[recKey].push(obj);
    });

    // Convert hash to single records if required.
    // from = { '1': [{id: 1, bar: 10}], '2': [{id: 2, bar: 12}] }
    // to = { '1': {id: 1, bar: 10}, '2': {id: 2, bar: 12} }
    if (!collection) {
      Object.keys(hash).forEach((key, i) => {
        const value = hash[key];

        if (value.length !== 1) {
          onError(i, `This result needs a single result object. A collection of ${value.length} elements was found.`);
        }

        hash[key] = value[0];
      });
    }

    return keys.map((key, i) => {
      const value = hash[key] || defaultElem;

      if (!value && elemReqd) {
        onError(i, `This key requires a non-null result. Null or empty-array found.`);
      }

      return value;
    });
  }

  static getUniqueKeys (keys) {
    // This is one of the fastest algorithms
    const found = {};
    const unique = [];

    keys.forEach(key => {
      if (!found[key]) {
        found[key] = unique.push(key);
      }
    });

    return unique;
  }

  static loaderFactory (service, id, multi, options = {}) {
    const { getKey = rec => rec[id], paramNames, injects } = options;

    return context => new BatchLoader(async (keys, context) => {
      const result = await service.find(makeCallingParams(
          context, { [id]: { $in: BatchLoader1.getUniqueKeys(keys) } }, paramNames, injects
        ));

      return BatchLoader1.getResultsByKey(keys, result, getKey, multi ? '[!]' : '!');
    },
      { context }
    );
  }
};

function dispatchQueue (loader, context) {
  const queue = loader._queue;
  loader._queue = [];

  const maxBatchSize = loader._options && loader._options.maxBatchSize;
  if (maxBatchSize && maxBatchSize > 0 && maxBatchSize < queue.length) {
    for (let i = 0; i < queue.length / maxBatchSize; i++) {
      dispatchQueueBatch(
        loader,
        queue.slice(i * maxBatchSize, (i + 1) * maxBatchSize),
        context
      );
    }
  } else {
    dispatchQueueBatch(loader, queue, context);
  }
}

function dispatchQueueBatch (loader, queue, context) {
  const keys = queue.map(({ key }) => key);

  const batchLoadFn = loader._batchLoadFn;
  const batchPromise = batchLoadFn(keys, context);

  if (!batchPromise || typeof batchPromise.then !== 'function') {
    throw new Error([
      'BatchLoader must be constructed with a function which accepts',
      'Array<key> and returns Promise<Array<value>>, but the function did',
      `not return a Promise: ${String(batchPromise)}.`
    ].join(' '));
  }

  batchPromise
    .then(values => {
      // Assert the expected resolution from batchLoadFn.
      if (!Array.isArray(values)) {
        throw new Error([
          'BatchLoader must be constructed with a function which accepts',
          'Array<key> and returns Promise<Array<value>>, but the function did',
          `not return a Promise of an Array: ${String(values)}.`
        ].join(' '));
      }
      if (values.length !== keys.length) {
        throw new Error([
          'DataLoader must be constructed with a function which accepts',
          'Array<key> and returns Promise<Array<value>>, but the function did',
          'not return a Promise of an Array of the same length as the Array',
          'of keys.',
          `\n\nKeys:\n${String(keys)}`,
          `\n\nValues:\n${String(values)}`
        ].join(' '));
      }

      queue.forEach(({ key, resolve, reject }, index) => {
        const value = values[index];
        if (value instanceof Error) {
          reject(value);
        } else {
          resolve(value);
        }
      });
    });
}

function enqueuePostPromiseJob (fn) {
  if (!resolvedPromise) {
    resolvedPromise = Promise.resolve();
  }
  resolvedPromise.then(() => nextTick(fn));
}

function getValidCacheMap (options) {
  let cacheMap = options && options.cacheMap;
  if (!cacheMap) return new Map();

  const missingFunctions = ['get', 'set', 'delete', 'clear'].filter(
    fnName => typeof cacheMap[fnName] !== 'function'
  );

  if (missingFunctions.length) {
    throw new TypeError([
      'options.cacheMap missing methods:',
      missingFunctions.join(', '),
      '(BatchLoader)'
    ].join(' '));
  }

  return cacheMap;
}

// copied from feathers-hooks-common v4 so Batch-Loader can be used with FeathersJS v3 (Buzzard)
function makeCallingParams (
  context, query, include = ['provider', 'authenticated', 'user'], inject = {}
) {
  const included = query ? { query } : {};
  const defaults = { _populate: 'skip', paginate: false };

  if (include) {
    (Array.isArray(include) ? include : [include]).forEach(name => {
      if (context.params && name in context.params) included[name] = context.params[name];
    });
  }

  return Object.assign(defaults, included, inject);
}

/* shout out to Facebook's GraphQL utilities */
