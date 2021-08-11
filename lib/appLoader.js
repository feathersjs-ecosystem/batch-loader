const ServiceLoader = require('./serviceLoader');

module.exports = class AppLoader {
  constructor ({ app, cache = new Map() }) {
    this.options = { app, cache };
  }

  service (serviceName) {
    const { app, cache } = this.options;
    const cached =
      cache.get(serviceName) ||
      new ServiceLoader({ service: app.service(serviceName) });

    cache.set(serviceName, cached);

    return cached;
  }

  clear (serviceName) {
    const { cache } = this.options;
    if (!serviceName) {
      cache.clear();
    } else {
      cache.delete(serviceName);
    }

    return this;
  }
};
