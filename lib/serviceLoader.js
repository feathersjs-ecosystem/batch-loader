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
const GetLoader = require('./getLoader');

const createDataLoader = ({
  service,
  idKey,
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
          [idKey]: { $in: uniqueKeys(keys) }
        }
      })
      .then(result => {
        const getResults = multi ? uniqueResultsMulti : uniqueResults;
        return getResults(
          keys,
          result,
          idKey
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

const createGetLoader = ({
  service,
  loaderOptions
}) => {
  if (!service.find) {
    throw new Error(
      'Cannot create a loader for a service that does not have a find method.'
    );
  }

  return new GetLoader({ ...loaderOptions, service });
};

module.exports = class ServiceLoader {
  constructor({
    service,
    cacheParamsFn = defaultCacheParamsFn,
    ...loaderOptions
  }) {
    this._cacheMap = new Map();
    this._cacheParamsFn = cacheParamsFn;
    this._options = {
      service,
      loaderOptions: {
        ...loaderOptions,
        cacheParamsFn
      }
    };
  }

  get(idObject, params, cacheParamsFn = this._cacheParamsFn) {
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

  find(idObject, params, cacheParamsFn = this._cacheParamsFn) {
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

class MyLoader {
  constructor({
    service,
    cacheParamsFn = defaultCacheParamsFn,
    ...loaderOptions
  }) {
    this._cacheMap = new Map();
    this._cacheParamsFn = cacheParamsFn;
    this._options = {
      service,
      loaderOptions: {
        ...loaderOptions,
        cacheParamsFn
      }
    };
  }

  get(id, params, cacheParamsFn = this._cacheParamsFn) {
    const { service, loaderOptions } = this._options;
    const key = stableStringify({ method: 'get' });
    const cachedLoader = this._cacheMap.get(key);

    if (cachedLoader) {
      return cachedLoader.load(id, params, cacheParamsFn);
    }

    const newLoader = createGetLoader({
      service,
      loaderOptions
    });

    this._cacheMap.set(key, newLoader);

    return newLoader.load(id, params, cacheParamsFn);
  }

  find(params, cacheParamsFn = this._cacheParamsFn) {
    const { service, loaderOptions } = this._options;
    const key = stableStringify({ method: 'find' });
    const cachedLoader = this._cacheMap.get(key);

    if (cachedLoader) {
      return cachedLoader.load(params, cacheParamsFn);
    }

    const newLoader = createFindLoader({
      service,
      loaderOptions
    });

    this._cacheMap.set(key, newLoader);

    return newLoader.load(params, cacheParamsFn);
  }

  _load({
    idKey,
    id,
    params,
    multi,
    cacheParamsFn
  }) {
    const { service, loaderOptions } = this._options;
    const key = stableStringify({
      method: 'load',
      multi,
      key: idKey,
      params: cacheParamsFn(params)
    });
    const cachedLoader = this._cacheMap.get(key);

    if (cachedLoader) {
      return cachedLoader.load(id, params);
    }

    const newLoader = createDataLoader({
      idKey,
      params,
      service,
      loaderOptions,
      multi
    });

    this._cacheMap.set(key, newLoader);

    return newLoader.load(id, params);
  }

  load(id, params, cacheParamsFn = this._cacheParamsFn) {
    const { service } = this._options;
    return this._load({
      id,
      params,
      cacheParamsFn,
      idKey: service.options.id,
      multi: false
    });
  }

  key(idKey) {
    return {
      load(id, params, cacheParamsFn = this._cacheParamsFn) {
        return this._load({
          id,
          params,
          cacheParamsFn,
          idKey,
          multi: false
        });
      }
    }
  }

  multi(idKey) {
    return {
      load(id, params, cacheParamsFn = this._cacheParamsFn) {
        return this._load({
          id,
          params,
          cacheParamsFn,
          idKey,
          multi: true
        });
      }
    }
  }
}
