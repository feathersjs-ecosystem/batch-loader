
const { assert } = require('chai');
const { AppLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('appLoader.test', () => {
  const app = makeApp();
  it('creates an AppLoader', () => {
    const appLoader = new AppLoader({ app });
    assert.isFunction(appLoader.service);
    assert.isFunction(appLoader.clear);
  });

  it('takes a cache option', () => {
    const cache = new Map([['posts', null]]);
    const appLoader = new AppLoader({ app, cache });
    assert.deepEqual(appLoader._options.cache.get('posts'), null);
  });

  it('returns a new ServiceLoader', () => {
    const appLoader = new AppLoader({ app });
    const serviceLoader = appLoader.service('posts');
    assert.isFunction(serviceLoader.load);
    assert.isFunction(serviceLoader.loadMulti);
    assert.isFunction(serviceLoader.get);
    assert.isFunction(serviceLoader.find);
  });

  it('returns a cached ServiceLoader', () => {
    const appLoader = new AppLoader({ app });
    const serviceLoader1 = appLoader.service('posts');
    const serviceLoader2 = appLoader.service('posts');
    assert.deepEqual(serviceLoader1, serviceLoader2);
  });

  it('passes serviceOptions', () => {
    const appLoader = new AppLoader({
      app,
      serviceOptions: {
        posts: {
          cacheOptions: { cacheParamsFn: testFunc },
          batchOptions: { cacheParamsFn: testFunc }
        }
      }
    });
    const serviceLoader = appLoader.service('posts');
    const cacheLoaderOptions = serviceLoader._cacheLoader._options;
    const batchLoaderOptions = serviceLoader._batchLoader._options;
    assert.deepEqual(batchLoaderOptions.cacheParamsFn, testFunc);
    assert.deepEqual(cacheLoaderOptions.cacheParamsFn, testFunc);
  });

  it('clears by serviceName', () => {
    const appLoader = new AppLoader({ app });
    appLoader.service('posts');
    appLoader.service('comments');
    appLoader.clear('posts');
    assert.deepEqual(appLoader._options.cache.size, 1);
  });

  it('clears all', () => {
    const appLoader = new AppLoader({ app });
    appLoader.service('posts');
    appLoader.service('comments');
    appLoader.clear();
    assert.deepEqual(appLoader._options.cache.size, 0);
  });
});
