const {
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn
} = require('./utils')

module.exports = class GetLoader {
  constructor({
    service,
    cacheParamsFn = defaultCacheParamsFn,
    cacheKeyFn = defaultCacheKeyFn
  }) {
    this._options = { service }
    this._cacheParamsFn = cacheParamsFn
    this._cacheKeyFn = cacheKeyFn
    this._cacheMap = new Map()
  }

  load(id, params, cacheParamsFn = this._cacheParamsFn) {
    const { service } = this._options
    const key = stableStringify([this._cacheKeyFn(id), cacheParamsFn(params)])
    const cached = this._cacheMap.get(key)

    if (cached) {
      return cached
    }

    const promise = service.get(id, params)

    this._cacheMap.set(key, promise)

    return promise
  }

  clear(id, params, cacheParamsFn = this._cacheParamsFn) {
    const key = stableStringify([
      this._cacheKeyFn(id),
      cacheParamsFn(params)
    ])
    this._cacheMap.delete(key)
    return this
  }

  clearAll() {
    this._cacheMap.clear()
    return this
  }

  prime(id, params, data, cacheParamsFn = this._cacheParamsFn) {
    const key = stableStringify([this._cacheKeyFn(id), cacheParamsFn(params)])
    const cached = this._cacheMap.get(key)
    if (cached) {
      return this
    }
    this._cacheMap.set(key, Promise.resolve(data))
    return this
  }
}
