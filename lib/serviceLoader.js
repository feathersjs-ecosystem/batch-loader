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
    const cached = this._cacheMap.get(key);

    if (cached) {
      return cached;
    }

    const loader = createDataLoader({
      idProp,
      params,
      service,
      loaderOptions,
      multi: false
    });

    this._cacheMap.set(key, loader);

    return loader.load(idValue);
  }

  find(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    const { service, loaderOptions } = this._options;

    if (idObject === null) {
      const key = stableStringify([
        null,
        stableStringify(cacheParamsFn(params))
      ]);
      const cached = this._cacheMap.get(key);

      if (cached) {
        return cached;
      }

      const loader = createFindLoader({ service, loaderOptions });

      this._cacheMap.set(key, loader);

      return loader.load(params);
    }

    const [idProp, idValue] = getIdOptions(idObject);
    const key = stableStringify([
      idProp,
      stableStringify(cacheParamsFn(params))
    ]);
    const cached = this._cacheMap.get(key);

    if (cached) {
      return cached;
    }

    const loader = createDataLoader({
      idProp,
      params,
      service,
      loaderOptions,
      multi: true
    });

    this._cacheMap.set(key, loader);

    return loader.load(idValue);
  }

  remove(idObject, params, cacheParamsFn = this._options.cacheParamsFn) {
    if (!idObject && !params) {
      this._cacheMap.forEach(loader => loader._cacheMap.clear());
      return this;
    }

    const removeParams = stableStringify(cacheParamsFn(params));

    if (idObject === null) {
      this._cacheMap.forEach((loader, loaderKey) => {
        const [, cachedParams] = JSON.parse(loaderKey);
        loader._cacheMap.forEach((result, resultKey) => {
          if (removeParams === cachedParams) {
            loader._cacheMap.delete(resultKey);
          }
        });
      });

      return this;
    }

    const [idProp, idValue] = getIdOptions(idObject);

    this._cacheMap.forEach((loader, loaderKey) => {
      const [cachedProp, cachedParams] = JSON.parse(loaderKey);

      loader._cacheMap.forEach((result, resultKey) => {
        if (cachedProp === null) {
          loader._cacheMap.delete(resultKey);
        }
        if (
          cachedProp === idProp &&
          idValue === resultKey &&
          removeParams === cachedParams
          ) {
          loader._cacheMap.delete(resultKey);
        }
      });
    });

    return this;
  }

  // update(idObject, data) {
  //   const [idProp, idValue] = getIdOptions(idObject);

  //   this._cacheMap.forEach((loader, loaderKey) => {
  //     const [cachedProp] = JSON.parse(loaderKey);
  //     loader._cacheMap.forEach((result, resultKey) => {
  //       if (cachedProp === null) {
  //         loader._cacheMap.delete(resultKey);
  //       }
  //       if (cachedProp === idProp) {
  //         const result  = loader._cacheMap.get(idValue);
  //         loader._cacheMap.set(resultKey, data);
  //       }
  //     });
  //   });

  //   return this;
  // }
};
