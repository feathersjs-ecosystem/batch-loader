const ServiceLoader = require('./serviceLoader');

module.exports = class ContextLoader {
  constructor(context, cache) {
    this.context = context;
    this.cache = cache || new Map();
    this.service = this.service.bind(this);
  }

  service(serviceName) {
    const cached =
      this.cache.get(serviceName) ||
      new ServiceLoader(this.context.app.service(serviceName));

    this.cache.set(serviceName, cached);

    return cached;
  }

  clear(serviceName) {
    if (!serviceName) {
      this.cache.clear();
      return;
    }

    this.cache.delete(serviceName);
  }
};
