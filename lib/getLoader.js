const {
  stableStringify,
  defaultCacheParamsFn
} = require('./utils');

module.exports = class GetLoader {
  constructor ({
    service,
    cacheParamsFn = defaultCacheParamsFn
  }) {
    this._options = { service, cacheParamsFn };
    this._cacheMap = new Map();
  }

  load (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service } = this._options;
    const key = stableStringify([id, cacheParamsFn(params)]);
    const cached = this._cacheMap.get(key);

    if (cached) {
      return cached;
    }

    const promise = service.get(id, params);

    this._cacheMap.set(key, promise);

    return promise;
  }

  clear (id, params, cacheParamsFn = this._options.cacheParamsFn) {
    if (id && !params) {
      this._cacheMap.forEach((value, key) => {
        const [parsedId] = JSON.parse(key);
        if (id === parsedId) {
          this._cacheMap.delete(key);
        }
      })
    } else {
      const key = stableStringify([id, cacheParamsFn(params)]);
      this._cacheMap.delete(key);
    }
    return this;
  }

  clearAll () {
    this._cacheMap.clear();
    return this;
  }

  prime (id, params, data, cacheParamsFn = this._options.cacheParamsFn) {
    const key = stableStringify([id, cacheParamsFn(params)]);
    const cached = this._cacheMap.get(key);
    if (cached) {
      return this;
    }
    this._cacheMap.set(key, Promise.resolve(data));
    return this;
  }
};
