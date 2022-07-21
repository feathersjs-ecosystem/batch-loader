
const { assert } = require('chai');
const { AppLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('appLoader.test', () => {
  const app = makeApp();
  it('creates an AppLoader', () => {
    const appLoader = new AppLoader({ app });
    assert.isFunction(appLoader.service);
    // assert.isFunction(appLoader.remove);
  });

  it('returns a new ServiceLoader', () => {
    const appLoader = new AppLoader({ app });
    const serviceLoader = appLoader.service('posts');
    assert.isFunction(serviceLoader.get);
    assert.isFunction(serviceLoader.find);
    // assert.isFunction(serviceLoader.remove);
    // assert.isFunction(serviceLoader.update);
  });

  it('returns a cached ServiceLoader', () => {
    const appLoader = new AppLoader({ app });
    const serviceLoader1 = appLoader.service('posts');
    const serviceLoader2 = appLoader.service('posts');
    assert.deepEqual(serviceLoader1, serviceLoader2);
  });

  it('passes service options', () => {
    const appLoader = new AppLoader({
      app,
      services: {
        posts: {
          cacheParamsFn: testFunc
        }
      }
    });
    const serviceLoader = appLoader.service('posts');
    const cachedOptions = serviceLoader._options;
    assert.deepEqual(cachedOptions.cacheParamsFn, testFunc);
  });

  it('passes default options', () => {
    const appLoader = new AppLoader({
      app,
      cacheParamsFn: testFunc
    });
    const serviceLoader = appLoader.service('posts');
    const cachedOptions = serviceLoader._options;
    assert.deepEqual(cachedOptions.cacheParamsFn, testFunc);
  });
});
