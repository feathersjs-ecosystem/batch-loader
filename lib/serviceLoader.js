const DataLoader = require('dataloader')
const FindLoader = require('./findLoader')
const GetLoader = require('./getLoader')
const {
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn,
  uniqueKeys,
  uniqueResults,
  uniqueResultsMulti
} = require('./utils')

const createDataLoader = ({
  service,
  idKey,
  loaderOptions,
  multi,
  params = {}
}) => {
  if (!service.find) {
    throw new Error('Cannot create a loader for a service that does not have a find method.')
  }

  const getResults = multi ? uniqueResultsMulti : uniqueResults

  return new DataLoader(async (keys) => {
    return service
      .find({
        ...params,
        paginate: false,
        query: {
          ...params.query,
          // TODO: Should this be placed in an $and query?
          [idKey]: { $in: uniqueKeys(keys) }
        }
      })
      .then((result) => {
        return getResults(keys, result, idKey)
      })
  }, loaderOptions)
}

const createFindLoader = ({ service, loaderOptions }) => {
  if (!service.find) {
    throw new Error('Cannot create a FindLoader for a service that does not have a find method.')
  }

  return new FindLoader({ ...loaderOptions, service })
}

const createGetLoader = ({ service, loaderOptions }) => {
  if (!service.find) {
    throw new Error('Cannot create a GetLoader for a service that does not have a find method.')
  }

  return new GetLoader({ ...loaderOptions, service })
}

module.exports = class ServiceLoader {
  constructor({ service, ...options }) {
    const loaderOptions = {
      cacheParamsFn: defaultCacheParamsFn,
      cacheKeyFn: defaultCacheKeyFn,
      ...options
    }
    this._cacheMap = new Map()
    this._cacheParamsFn = loaderOptions.cacheParamsFn
    this._options = { service, loaderOptions }
  }

  get(id, params, cacheParamsFn = this._cacheParamsFn) {
    const { service, loaderOptions } = this._options
    const key = stableStringify({ method: 'get' })
    const cachedLoader = this._cacheMap.get(key)

    if (cachedLoader) {
      return cachedLoader.load(id, params, cacheParamsFn)
    }

    const newLoader = createGetLoader({
      service,
      loaderOptions
    })

    this._cacheMap.set(key, newLoader)

    return newLoader.load(id, params, cacheParamsFn)
  }

  find(params, cacheParamsFn = this._cacheParamsFn) {
    const { service, loaderOptions } = this._options
    const key = stableStringify({ method: 'find' })
    const cachedLoader = this._cacheMap.get(key)

    if (cachedLoader) {
      return cachedLoader.load(params, cacheParamsFn)
    }

    const newLoader = createFindLoader({
      service,
      loaderOptions
    })

    this._cacheMap.set(key, newLoader)

    return newLoader.load(params, cacheParamsFn)
  }

  exec({ ...options }) {
    const { service, loaderOptions } = this._options
    const {
      id,
      idKey,
      params,
      multi,
      cacheParamsFn
    } = {
      idKey: service.options && service.options.id,
      params: {},
      multi: false,
      cacheParamsFn: this._cacheParamsFn,
      ...options
    }
    const key = stableStringify({
      method: 'load',
      multi,
      idKey,
      params: cacheParamsFn(params)
    })
    const cachedLoader = this._cacheMap.get(key)

    if (cachedLoader) {
      if (Array.isArray(id)) {
        return cachedLoader.loadMany(id)
      }
      return cachedLoader.load(id)
    }

    const newLoader = createDataLoader({
      idKey,
      params,
      service,
      loaderOptions,
      multi
    })

    this._cacheMap.set(key, newLoader)

    if (Array.isArray(id)) {
      return newLoader.loadMany(id)
    }
    return newLoader.load(id)
  }

  load(id, params, cacheParamsFn = this._cacheParamsFn) {
    const { service } = this._options
    const idKey = service.options && service.options.id

    if (!idKey) {
      throw new Error('Cannot call ServiceLoader.load on service that does not have an "options.id". You can also call ServiceLoader.key("id").load(123) or ServiceLoader.exec({ id: 123, idKey: "id" })')
    }

    return this.exec({
      id,
      idKey,
      params,
      cacheParamsFn,
      multi: false
    })
  }

  key(idKey) {
    return {
      load: (id, params, cacheParamsFn = this._cacheParamsFn) => {
        return this.exec({
          id,
          idKey,
          params,
          cacheParamsFn,
          multi: false
        })
      }
    }
  }

  multi(idKey) {
    return {
      load: (id, params, cacheParamsFn = this._cacheParamsFn) => {
        return this.exec({
          id,
          idKey,
          params,
          cacheParamsFn,
          multi: true
        })
      }
    }
  }

  clearAll() {
    this._cacheMap.clear()
    return this
  }
}
