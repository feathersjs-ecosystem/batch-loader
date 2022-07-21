const ServiceLoader = require('./serviceLoader');

module.exports = class AppLoader {
  constructor ({ app, services = {}, ...loaderOptions }) {
    this._options = { app, services, loaderOptions };
    this._cacheMap = new Map();
  }

  service (serviceName) {
    const { app, services, loaderOptions } = this._options;
    const options = { ...loaderOptions, ...(services[serviceName] || {}) };
    const cached = this._cacheMap.get(serviceName);

    if (cached) {
      return cached;
    }

    const loader = new ServiceLoader({
      ...options,
      service: app.service(serviceName)
    });

    this._cacheMap.set(serviceName, loader);

    return loader;
  }
};
