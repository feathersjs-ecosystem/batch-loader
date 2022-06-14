const CacheLoader = require('./cacheloader');
const BatchLoader = require('./batchloader');
const { getIdOptions } = require('./utils');

module.exports = class ServiceLoader {
  constructor ({
    service,
    batchOptions = {},
    cacheOptions = {}
  }) {
    this._options = { service };
    this._batchLoader = new BatchLoader({
      ...batchOptions,
      service
    });
    this._cacheLoader = new CacheLoader({
      ...cacheOptions,
      service
    });
  }

  load (idObject, params) {
    return this._batchLoader.load(idObject, params);
  }

  loadMulti (idObject, params) {
    return this._batchLoader.loadMulti(idObject, params);
  }

  get (id, params) {
    return this._cacheLoader.get(id, params);
  }

  find (params) {
    return this._cacheLoader.find(params);
  }

  clear (idObject, params) {
    const { service } = this._options;

    if (idObject) {
      const [, idValue] = getIdOptions(idObject, service.id);
      this._batchLoader.clear(idObject, params);
      this._cacheLoader.clear(idValue, params);
      return this;
    }

    this._batchLoader.clear(null, params);
    this._cacheLoader.clear(null, params);
    return this;
  }
};
