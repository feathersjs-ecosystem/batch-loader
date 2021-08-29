const {
  stableStringify,
  defaultCacheParamsFn,
  getIdOptions
} = require('./utils');

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

module.exports = class BatchedServiceLoader {
  constructor({
    service,
    cache = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    loaderOptions
  }) {
    this._options = { service, cache, cacheParamsFn, loaderOptions };
  }

  load(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params)]);
    const cached =
      cache.get(key) ||
      createBatchLoader({
        idProp,
        params,
        service,
        options: loaderOptions,
        resultType: '!'
      });

    cache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  loadMulti(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params)]);
    const cached =
      cache.get(key) ||
      createBatchLoader({
        idProp,
        params,
        service,
        options: loaderOptions,
        resultType: '[!]'
      });

    cache.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clear(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache } = this._options;

    if (!idObject && !params) {
      cache.forEach(loader => loader.clear());
      return this;
    }


    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];
    const cachedParams = stableStringify(cacheParamsFn(params));

    cache.forEach((loader, key) => {
      const [keyProp, keyParams] = JSON.parse(key);
      const paramsMatch = cachedParams === stableStringify(keyParams);

      if (idProp === keyProp && paramsMatch) {
        keys.forEach(key => loader.clear(key));
      }
    });

    return this;
  }

};
