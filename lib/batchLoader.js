const {
  stableStringify,
  defaultCacheParamsFn,
  getIdOptions,
  uniqueKeys,
  uniqueResults,
  uniqueResultsMulti
} = require('./utils');
const DataLoader = require('dataloader');

// TODO: Update file case

const createDataLoader = ({
  service,
  idProp,
  options,
  multi,
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
          [idProp]: { $in: uniqueKeys(keys) }
        }
      })
      .then(result => {
        const getResults = multi ? uniqueResultsMulti : uniqueResults;
        return getResults(
          keys,
          result,
          idProp,
        );
      });
  }, options);
};

module.exports = class BatchLoader {
  constructor ({
    service,
    cacheMap = new Map(),
    cacheParamsFn = defaultCacheParamsFn,
    loaderOptions
  }) {
    this._options = { service, cacheMap, cacheParamsFn, loaderOptions };
  }

  load (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cacheMap, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params), 'load']);
    const cached =
      cacheMap.get(key) ||
      createDataLoader({
        idProp,
        params,
        service,
        multi: false,
        options: loaderOptions,
      });

    cacheMap.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  loadMulti (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cacheMap, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const key = stableStringify([idProp, cacheParamsFn(params), 'loadMulti']);
    const cached =
      cacheMap.get(key) ||
      createDataLoader({
        idProp,
        params,
        service,
        multi: true,
        options: loaderOptions
      });

    cacheMap.set(key, cached);

    if (Array.isArray(idValue)) {
      return cached.loadMany(idValue);
    }

    return cached.load(idValue);
  }

  clear (idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, cacheMap } = this._options;
    const cachedParams = stableStringify(cacheParamsFn(params));

    if (!idObject && !params) {
      cacheMap.forEach(loader => loader.clearAll());
      return this;
    }

    if (!idObject) {
      cacheMap.forEach((loader, key) => {
        const [, keyParams] = JSON.parse(key);
        const paramsMatch = cachedParams === stableStringify(keyParams);
        if (paramsMatch) {
          loader.clearAll();
        }
      });
      return this;
    }

    const [idProp, idValue] = getIdOptions(idObject, service.id);
    const keys = Array.isArray(idValue) ? idValue : [idValue];

    cacheMap.forEach((loader, key) => {
      const [keyProp, keyParams] = JSON.parse(key);
      const paramsMatch = cachedParams === stableStringify(keyParams);

      if (idProp === keyProp && paramsMatch) {
        keys.forEach(key => loader.clear(key));
      }
    });

    return this;
  }
};
