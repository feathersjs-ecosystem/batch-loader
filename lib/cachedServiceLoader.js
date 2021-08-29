const {
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn
} = require('./utils');

module.exports = class CachedServiceLoader {
  constructor({
    service,
    cache = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    cacheKeyFn = defaultCacheKeyFn
  }) {
    this._options = { service, cache, cacheParamsFn, cacheKeyFn };
  }

  get(id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache } = this._options;
    const key = stableStringify([cacheKeyFn(id), cacheParamsFn(params)]);
    const cached = cache.get(key) || service.get(id, params);

    cache.set(key, cached);

    return cached;
  }

  find(params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache } = this._options;
    const key = stableStringify([null, cacheParamsFn(params)]);
    const cached = cache.get(key) || service.find(params);

    cache.set(key, cached);

    return cached;
  }

  clear(id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { cache } = this._options;

    if (!id && !params) {
      cache.clear();
      return this;
    }

    const cachedParams = stableStringify(cacheParamsFn(params));

    cache.forEach((value, key) => {
      const [keyId, keyParams] = JSON.parse(key);
      const paramsMatch = cachedParams === stableStringify(keyParams);

      if (!keyId && paramsMatch) {
        cache.delete(key);
        return;
      }

      if (cacheKeyFn(id) === keyId && paramsMatch) {
        cache.delete(key);
        return;
      }
    });

    return this;
  }
};
