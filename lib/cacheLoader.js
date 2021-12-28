const {
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn
} = require('./utils');

module.exports = class CacheLoader {
  constructor ({
    service,
    cacheMap = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    cacheKeyFn = defaultCacheKeyFn
  }) {
    this._options = { service, cacheMap, cacheParamsFn, cacheKeyFn };
  }

  get (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cacheMap, cacheKeyFn } = this._options;
    const key = stableStringify([cacheKeyFn(id), cacheParamsFn(params), 'get']);
    const cached = cacheMap.get(key) || service.get(id, params);

    cacheMap.set(key, cached);

    return cached;
  }

  find (params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cacheMap } = this._options;
    const key = stableStringify([null, cacheParamsFn(params), 'find']);
    const cached = cacheMap.get(key) || service.find(params);

    cacheMap.set(key, cached);

    return cached;
  }

  clear (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { cacheMap, cacheKeyFn } = this._options;
    const cachedParams = stableStringify(cacheParamsFn(params));

    if (!id && !params) {
      cacheMap.clear();
      return this;
    }

    if (!id) {
      cacheMap.forEach((value, key) => {
        const [, keyParams] = JSON.parse(key);
        const paramsMatch = cachedParams === stableStringify(keyParams);
        if (paramsMatch) {
          cacheMap.delete(key);
        }
      });
      return this;
    }

    cacheMap.forEach((value, key) => {
      const [keyId, keyParams, method] = JSON.parse(key);
      const paramsMatch = cachedParams === stableStringify(keyParams);

      if (method === 'find' && paramsMatch) {
        cacheMap.delete(key);
        return;
      }

      if (cacheKeyFn(id) === keyId && paramsMatch) {
        cacheMap.delete(key);
      }
    });

    return this;
  }
};
