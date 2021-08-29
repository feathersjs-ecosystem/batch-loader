
const findKey = '_FIND_';

module.exports = class MethodLoader {
  constructor({
    service,
    params = {},
    cache = new Map(),
    cacheKeyFn = id => id.toString ? id.toString() : String(id)
  }) {
    this.options = { service, params, cache, cacheKeyFn };
  }

  get(id) {
    const { service, params, cache, cacheKeyFn } = this.options;
    const key = cacheKeyFn(id);
    const cached = cache.get(key) || service.get(id, params);

    cache.set(key, cached);

    return cached;
  }

  find() {
    const { service, params, cache } = this.options;
    const cached = cache.get(findKey) || service.find(params);

    cache.set(findKey, cached);

    return cached;
  }

  clear(id) {
    const { cache } = this.options;

    if (!id) {
      cache.clear();
      return this;
    }

    const key = cacheKeyFn(id);

    cache.delete(key);
    cache.delete(findKey);

    return this;
  }
};
