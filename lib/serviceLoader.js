const BatchLoader = require('./batchLoader');

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

const getIdOptions = (idObj, defaultProp) => {
  if (isObject(idObj)) {
    const entries = Object.entries(idObj);

    if (entries.length !== 1) {
      throw new Error(
        'When using an object as an id, the object must have exactly one property where the property name is the name of the foreign key. For example, { post_id: "123" } or { post_id: ["123", "456"] }'
      );
    }

    return entries[0];
  }

  return [defaultProp, idObj];
};

const getSafeParams = (params, filterParams) => {
  if (!params) {
    return params;
  }

  if (Array.isArray(filterParams)) {
    return filterParams.reduce((accum, key) => {
      if (typeof params[key] !== 'undefined') {
        accum[key] = params[key];
      }
      return accum;
    }, {});
  }

  return filterParams(params);
};

const createLoader = ({ idProp, resultType, options, params = {} }) => {
  if (!this.service.find) {
    throw new Error(
      'Cannot create a loader for a service that does not have a find method.'
    );
  }

  return new BatchLoader(async keys => {
    return this.service
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
}

module.exports = class ServiceLoader {
  constructor(service, options = {}) {
    this.service = service;
    this.options = {
      filterParams: ['query', 'user', 'authentication'],
      ...options,
      cacheKeyFn: key => (key.toString ? key.toString() : String(key))
    };
    this.getCache = new Map();
    this.findCache = new Map();
    this.loadCache = new Map();
    this.loadManyCache = new Map();
  }

  load(idObject, params, filterParams = this.options.filterParams) {
    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const safeParams = getSafeParams(params, filterParams);
    const key = stableStringify([idProp, safeParams]);
    const cached =
      this.loadCache.get(key) ||
      createLoader({
        idProp,
        params,
        resultType: '!',
        options: this.options
      });

    this.loadCache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clearLoad(idObject, params) {
    if (!idObject) {
      this.loadCache.forEach(loader => loader.clearAll());
      return;
    }

    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    this.loadCache.forEach((loader, key) => {
      const [_idProp, _params] = JSON.parse(key);
      if (idProp === _idProp) {
        if (!params) {
          keys.forEach(key => loader.clear(key));
        }
        if (stableStringify(params) === stableStringify(_params)) {
          keys.forEach(key => loader.clear(key));
        }
      }
    });
  }

  loadMany(idObject, params, filterParams = this.options.filterParams) {
    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const safeParams = getSafeParams(params, filterParams);
    const key = stableStringify([idProp, safeParams]);
    const cached =
      this.loadManyCache.get(key) ||
      createLoader({
        idProp,
        params,
        resultType: '[!]',
        options: this.options
      });

    this.loadManyCache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clearLoadMany(idObject, params) {
    if (!idObject) {
      this.loadManyCache.forEach(loader => loader.clearAll());
      return;
    }

    const [idProp, idValue] = getIdOptions(idObject, this.service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    this.loadManyCache.forEach((loader, key) => {
      const [_idProp, _params] = JSON.parse(key);
      if (idProp === _idProp) {
        if (!params) {
          keys.forEach(key => loader.clear(key));
        }
        if (stableStringify(params) === stableStringify(_params)) {
          keys.forEach(key => loader.clear(key));
        }
      }
    });
  }

  get(id, params, filterParams = this.options.filterParams) {
    const safeParams = getSafeParams(params, filterParams);
    const key = stableStringify([id, safeParams]);
    const cached =
      this.getCache.get(key) ||
      this.service.get(id, params);

    this.getCache.set(key, cached);

    return cached;
  }

  clearGet(id, params) {
    const { cacheKeyFn } = this.options;

    if (!id) {
      this.getCache.clear();
      return;
    }

    this.getCache.forEach((value, key) => {
      const [_id, _params] = JSON.parse(key);
      if (cacheKeyFn(id) === cacheKeyFn(_id)) {
        if (!params) {
          this.getCache.delete(key);
        }
        if (stableStringify(params) === stableStringify(_params)) {
          this.getCache.delete(key);
        }
      }
    });
  }

  find(params, filterParams = this.options.filterParams) {
    const safeParams = getSafeParams(params, filterParams);
    const key = stableStringify([safeParams]);
    const cached =
      this.findCache.get(key) ||
      this.service.find(params);

    this.findCache.set(key, cached);

    return cached;
  }

  clearFind(params) {
    if (!params) {
      this.findCache.clear();
      return;
    }

    this.findCache.forEach((value, key) => {
      if (stableStringify([params]) === key) {
        this.findCache.delete(key);
      }
    });
  }
};
