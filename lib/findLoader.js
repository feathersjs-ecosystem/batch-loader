const {
  stableStringify,
  defaultCacheParamsFn
} = require('./utils');

module.exports = class FindLoader {
  constructor ({
    service,
    cacheParamsFn = defaultCacheParamsFn
  }) {
    this._options = { service, cacheParamsFn };
    this._cacheMap = new Map();
  }

  load (params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service } = this._options;
    const key = stableStringify([cacheParamsFn(params)]);
    const cached = this._cacheMap.get(key);

    if (cached) {
      return cached;
    }

    const promise = service.find(params);

    this._cacheMap.set(key, promise);

    return promise;
  }

  clear (params, cacheParamsFn = this._options.cacheParamsFn) {
    const key = stableStringify([cacheParamsFn(params)]);
    this._cacheMap.delete(key);
    return this;
  }

  clearAll () {
    this._cacheMap.clear();
    return this;
  }

  prime (params, data, cacheParamsFn = this._options.cacheParamsFn) {
    const key = stableStringify([cacheParamsFn(params)]);
    const cached = this._cacheMap.get(key);
    if (cached) {
      return this;
    }
    this._cacheMap.set(key, Promise.resolve(data));
    return this;
  }
};
