const BatchLoader = require('./batchLoader');
const MethodLoader = require('./methodLoader');

const isObject = maybeObj => {
  return maybeObj && typeof maybeObj === 'object' && !Array.isArray(maybeObj);
};

const stableStringify = obj => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') {
      throw new Error('Cannot stringify non JSON value');
    }

    if (isObject(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = value[key];
          return result;
        }, {});
    }

    return value;
  });
};

const getIdOptions = (idObject, defaultProp) => {
  if (isObject(idObject)) {
    const entries = Object.entries(idObject);

    if (entries.length !== 1) {
      throw new Error(
        'When using an object as an id, the object must have exactly one property where the property name is the name of the foreign key. For example, { post_id: "123" } or { post_id: ["123", "456"] }'
      );
    }

    return entries[0];
  }

  return [defaultProp, idObject];
};


const defaultCacheKeyFn = (params) => {
  return ['query', 'user', 'authentication'].reduce((accum, key) => {
    if (typeof params[key] !== 'undefined') {
      accum[key] = params[key];
    }
    return accum;
  }, {});
}

const createBatchLoader = ({
  service,
  idProp,
  resultType,
  options,
  params = {}
}) => {
  if (!service.find) {
    throw new Error(
      'Cannot create a loader for a service that does not have a find method.'
    );
  }

  return new BatchLoader(async keys => {
    return service
      .find({
        ...params,
        paginate: false,
        query: {
          ...params.query,
          [idProp]: { $in: BatchLoader.getUniqueKeys(keys) }
        }
      })
      .then(result => {
        return BatchLoader.getResultsByKey(
          keys,
          result.data ? result.data : result,
          idProp,
          resultType
        );
      });
  }, options);
};

module.exports = class ServiceLoader {
  constructor({
    service,
    batchOptions = {},
    caches = {},
    cacheKeyFn = defaultCacheKeyFn,
  }) {
    this.options = {
      service,
      cacheKeyFn,
      caches: {
        ...caches,
        get: new Map(),
        find: new Map(),
        load: new Map(),
        loadMany: new Map(),
      },
      batchOptions: {
        ...batchOptions,
        cacheKeyFn: key => (key.toString ? key.toString() : String(key))
      }
    }
  }

  load(idObject, params, cacheKeyFn = this.options.cacheKeyFn) {
    const { service, caches, batchOptions } = this.options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheKeyFn(params)]);
    const cache = caches.load;
    const cached =
      cache.get(key) ||
      createBatchLoader({
        idProp,
        params,
        service,
        options: batchOptions,
        resultType: '!'
      });

    cache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  loadMulti(idObject, params, cacheKeyFn = this.options.cacheKeyFn) {
    const { service, caches, batchOptions } = this.options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheKeyFn(params)]);
    const cache = caches.loadMulti;
    const cached =
      cache.get(key) ||
      createBatchLoader({
        idProp,
        params,
        service,
        options: batchOptions,
        resultType: '[!]'
      });

    cache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  get(id, params, cacheKeyFn = this.options.cacheKeyFn) {
    const { service, caches } = this.options;
    const key = stableStringify([id, cacheKeyFn(params)]);
    const cache = caches.get;
    const cached = cache.get(key) || new MethodLoader({ service, params });

    cache.set(key, cached);

    return cached.get(id);
  }

  find(params, cacheKeyFn = this.options.cacheKeyFn) {
    const { service, caches } = this.options;
    const key = stableStringify([cacheKeyFn(params)]);
    const cache = caches.find;
    const cached = cache.get(key) || new MethodLoader({ service, params });

    cache.set(key, cached);

    return cached.find();
  }

  clear(idObject, params, cacheKeyFn = this.options.cacheKeyFn) {
    const { service, caches } = this.options;
    if (!idObject && !params) {
      Object.values(caches).forEach(cache => cache.clear());
      // Clear the interncal caches instead of the parent map?
      // Object.values(caches).forEach(cache => {
      //   cache.forEach(loader => loader.clear());
      // });
      return this;
    }

    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    Object.values(caches).forEach(cache => {
      cache.forEach((loader, key) => {
        const [_idProp, _params] = JSON.parse(key);
        if (idProp === _idProp) {
          if (!params) {
            keys.forEach(key => loader.clear(key));
          }
          if (stableStringify(cacheKeyFn(params)) === stableStringify(_params)) {
            keys.forEach(key => loader.clear(key));
          }
        }
      });
    });

    return this;
  }
};
