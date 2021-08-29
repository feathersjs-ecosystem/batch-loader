const CacheLoader = require('./cacheLoader');
const BatchLoader = require('./batchLoader');
const { getIdOptions } = require('./utils');


module.exports = class ServiceLoader {
  constructor({
    service,
    batchOptions = {},
    cacheOptions = {},
  }) {
    this._batchLoader = new BatchLoader({
      ...batchOptions,
      service
    });
    this._cacheLoader = new CacheLoader({
      ...cacheOptions,
      service
    });
  }

  load(idObject, params) {
    return this._batchLoader.load(idObject, params);
  }

  loadMulti(idObject, params) {
    return this._batchLoader.loadMulti(idObject, params);
  }

  get(id, params) {
    return this._cacheLoader.get(id, params);
  }

  find(params) {
    return this._cacheLoader.find(params);
  }

  clear(idObject, params) {
    if (!idObject && !params) {
      this._batchLoader.clear();
      this._cacheLoader.clear();
      return this;
    }

    const [, idValue] = getIdOptions(idObject, service.id);
    this._batchLoader.clear(idObject, params);
    this._cacheLoader.clear(idValue, params);
    return this;
  }
};
