const {
  stableStringify,
  defaultCacheParamsFn,
  getIdOptions,
  uniqueKeys,
  uniqueResults,
  uniqueResultsMulti
} = require('./utils');
const DataLoader = require('dataloader');
const FindLoader = require('./findLoader');

const createDataLoader = ({
  service,
  idProp,
  loaderOptions,
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
        ...params,
        paginate: false,
        query: {
          ...params.query,
          // TODO: Should this be placed in a $and query?
          [idProp]: { $in: uniqueKeys(keys) }
        }
      })
      .then(result => {
        const getResults = multi ? uniqueResultsMulti : uniqueResults;
        return getResults(
          keys,
          result,
          idProp
        );
      });
  }, loaderOptions);
};

const createFindLoader = ({
  service,
  loaderOptions
}) => {
  if (!service.find) {
    throw new Error(
      'Cannot create a loader for a service that does not have a find method.'
    );
  }

  return new FindLoader({ ...loaderOptions, service });
};

module.exports = class ServiceLoader {
  constructor({
    service,
    cacheParamsFn = defaultCacheParamsFn,
    ...loaderOptions
  }) {
    this._cacheMap = new Map();
    this._options = { service, cacheParamsFn, loaderOptions };
  }

  get(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, loaderOptions } = this._options;
    const [idProp, idValue] = getIdOptions(idObject);
    const key = stableStringify([
      idProp,
      stableStringify(cacheParamsFn(params))
    ]);
    const cachedLoader = this._cacheMap.get(key);

    if (cachedLoader) {
      return cachedLoader.load(idValue);
    }

    const newLoader = createDataLoader({
      idProp,
      params,
      service,
      loaderOptions,
      multi: false
    });

    this._cacheMap.set(key, newLoader);

    return newLoader.load(idValue);
  }

  find(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, loaderOptions } = this._options;

    if (idObject === null) {
      const key = stableStringify([
        null,
        stableStringify(cacheParamsFn(params))
      ]);
      const cachedLoader = this._cacheMap.get(key);

      if (cachedLoader) {
        return cachedLoader.load(params);
      }

      const newLoader = createFindLoader({ service, loaderOptions });

      this._cacheMap.set(key, newLoader);

      return newLoader.load(params);
    }

    const [idProp, idValue] = getIdOptions(idObject);
    const key = stableStringify([
      idProp,
      stableStringify(cacheParamsFn(params))
    ]);
    const cachedLoader = this._cacheMap.get(key);

    if (cachedLoader) {
      return cachedLoader.load(idValue);
    }

    const newLoader = createDataLoader({
      idProp,
      params,
      service,
      loaderOptions,
      multi: true
    });

    this._cacheMap.set(key, newLoader);

    return newLoader.load(idValue);
  }

  clearAll() {
    this._cacheMap.forEach((loader) => loader.clearAll());
    return this;
  }
};
