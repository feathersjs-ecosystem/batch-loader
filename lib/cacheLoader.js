const {
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn
} = require('./utils');

module.exports = class CacheLoader {
  constructor ({
    service,
    cache = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    cacheKeyFn = defaultCacheKeyFn
  }) {
    this._options = { service, cache, cacheParamsFn, cacheKeyFn };
  }

  get (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache, cacheKeyFn } = this._options;
    const key = stableStringify([cacheKeyFn(id), cacheParamsFn(params), 'get']);
    const cached = cache.get(key) || service.get(id, params);

    cache.set(key, cached);

    return cached;
  }

  find (params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache } = this._options;
    const key = stableStringify([null, cacheParamsFn(params), 'find']);
    const cached = cache.get(key) || service.find(params);

    cache.set(key, cached);

    return cached;
  }

  clear (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { cache, cacheKeyFn } = this._options;
    const cachedParams = stableStringify(cacheParamsFn(params));

    if (!id && !params) {
      cache.clear();
      return this;
    }

    if (!id) {
      cache.forEach((value, key) => {
        const [, keyParams] = JSON.parse(key);
        const paramsMatch = cachedParams === stableStringify(keyParams);
        if (paramsMatch) {
          cache.delete(key);
        }
      });
      return this;
    }

    cache.forEach((value, key) => {
      const [keyId, keyParams, method] = JSON.parse(key);
      const paramsMatch = cachedParams === stableStringify(keyParams);

      if (method === 'find' && paramsMatch) {
        cache.delete(key);
        return;
      }

      if (cacheKeyFn(id) === keyId && paramsMatch) {
        cache.delete(key);
      }
    });

    return this;
  }
};
