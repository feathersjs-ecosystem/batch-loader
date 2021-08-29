const CachedServiceLoader = require('./cachedServiceLoader');
const BatchedServiceLoader = require('./batchedServiceLoader');
const { getIdOptions } = require('./utils');


module.exports = class ServiceLoader {
  constructor({
    service,
    batchOptions = {},
    cacheOptions = {},
  }) {
    this._batchedServiceLoader = new BatchedServiceLoader({
      ...cacheOptions,
      service
    });
    this._cachedServiceLoader = new CachedServiceLoader({
      ...batchOptions,
      service
    });
  }

  load(idObject, params) {
    return this._batchedServiceLoader.load(idObject, params);
  }

  loadMulti(idObject, params) {
    return this._batchedServiceLoader.loadMulti(idObject, params);
  }

  get(id, params) {
    return this._cachedServiceLoader.get(id, params);
  }

  find(params) {
    return this._cachedServiceLoader.find(params);
  }

  clear(idObject, params) {
    const [, idValue] = getIdOptions(idObject, service.id);
    this._batchedServiceLoader.clear(idObject, params);
    this._cachedServiceLoader.clear(idValue, params);
    return this;
  }
};
