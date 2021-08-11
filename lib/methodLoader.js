
const findKey = '_FIND_';

module.exports = class MethodLoader {
  constructor (service, params = {}, cache = new Map()) {
    this.service = service;
    this.cache = cache;
    this.params = params;
  }

  get (id) {
    const key = id.toString ? id.toString() : String(id);
    const cached = cache.get(key) || this.service.get(id, this.params);

    cache.set(key, cached);

    return cached;
  }

  find () {
    const cached = cache.get(findKey) || this.service.find(this.params);

    cache.set(findKey, cached);

    return cached;
  }

  clear (id) {
    if (!id) {
      this.cache.clear();
      return;
    }

    const key = id.toString ? id.toString() : String(id);

    this.cache.delete(key);
    this.cache.delete(findKey);
  }
};
