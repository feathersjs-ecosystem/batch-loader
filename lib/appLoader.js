const ServiceLoader = require('./serviceLoader');

module.exports = class AppLoader {
  constructor({ app, cacheMap = new Map(), serviceOptions = {} }) {
    this._options = { app, cacheMap, serviceOptions };
  }

  service(serviceName) {
    const { app, cacheMap, serviceOptions } = this._options;
    const options = serviceOptions[serviceName] || {};
    const cached =
      cacheMap.get(serviceName) ||
      new ServiceLoader({ ...options, service: app.service(serviceName) });

    cacheMap.set(serviceName, cached);

    return cached;
  }

  clear(serviceName) {
    const { cacheMap } = this._options;
    if (!serviceName) {
      cacheMap.clear();
    } else {
      cacheMap.delete(serviceName);
    }

    return this;
  }
};
