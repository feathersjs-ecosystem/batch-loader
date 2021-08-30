const ServiceLoader = require('./serviceLoader');

module.exports = class AppLoader {
  constructor ({ app, cache = new Map(), serviceOptions = {} }) {
    this._options = { app, cache, serviceOptions };
  }

  service (serviceName) {
    const { app, cache, serviceOptions } = this._options;
    const options = serviceOptions[serviceName] || {};
    const cached =
      cache.get(serviceName) ||
      new ServiceLoader({ ...options, service: app.service(serviceName) });

    cache.set(serviceName, cached);

    return cached;
  }

  clear (serviceName) {
    const { cache } = this._options;
    if (!serviceName) {
      cache.clear();
    } else {
      cache.delete(serviceName);
    }

    return this;
  }
};
