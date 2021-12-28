const {
  stableStringify,
  defaultCacheParamsFn,
  getIdOptions
} = require('./utils');
const DataLoader = require('./dataLoader');

const createDataLoader = ({
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

  return new DataLoader(async keys => {
    return service
      .find({
        paginate: false,
        ...params,
        query: {
          ...params.query,
          [idProp]: { $in: DataLoader.getUniqueKeys(keys) }
        }
      })
      .then(result => {
        return DataLoader.getResultsByKey(
          keys,
          result.data ? result.data : result,
          idProp,
          resultType
        );
      });
  }, options);
};

module.exports = class BatchLoader {
  constructor ({
    service,
    cache = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    loaderOptions
  }) {
    this._options = { service, cache, cacheParamsFn, loaderOptions };
  }

  load (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params), 'load']);
    const cached =
      cache.get(key) ||
      createDataLoader({
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

  loadMulti (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params), 'loadMulti']);
    const cached =
      cache.get(key) ||
      createDataLoader({
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

  clear (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cache } = this._options;
    const cachedParams = stableStringify(cacheParamsFn(params));

    if (!idObject && !params) {
      cache.forEach(loader => loader.clear());
      return this;
    }

    if (!idObject) {
      cache.forEach((loader, key) => {
        const [, keyParams] = JSON.parse(key);
        const paramsMatch = cachedParams === stableStringify(keyParams);
        if (paramsMatch) {
          loader.clear();
        }
      });
      return this;
    }

    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

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
