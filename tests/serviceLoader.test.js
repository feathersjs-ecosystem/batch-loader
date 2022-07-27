
const { assert } = require('chai');
const { ServiceLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('serviceLoader.test', () => {
  const app = makeApp();
  it('creates a serviceLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    assert.isFunction(serviceLoader.get);
    assert.isFunction(serviceLoader.find);
    // assert.isFunction(serviceLoader.remove);
    // assert.isFunction(serviceLoader.update);
  });

  it('takes a cacheParamsFn option', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    });
    assert.deepEqual(serviceLoader._options.cacheParamsFn, testFunc);
  });

  it('returns a new DataLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get({ id: 1 });
    assert.deepEqual(serviceLoader._cacheMap.size, 1);
  });

  it('returns a cached DataLoader', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get({ id: 1 });
    serviceLoader.get({ id: 1 });
    assert.deepEqual(serviceLoader._cacheMap.size, 1);
  });

  it('passes loader options', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      cacheKeyFn: testFunc
    });
    serviceLoader.get({ id: 1 });
    const dataLoader = serviceLoader._cacheMap.get('["id","{}"]');
    assert.deepEqual(dataLoader._cacheKeyFn, testFunc);
  });

  it('works with get({ id: 1 })', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    const defaultResult = await app.service('posts').get(1);
    const result = await serviceLoader.get({ id: 1 });
    assert.deepEqual(result, defaultResult);
  });

  it('works with find({ id: 1 })', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    const defaultResult = await app.service('posts').get(1);
    const result = await serviceLoader.find({ id: 1 });
    assert.deepEqual(result, [defaultResult]);
  });

  it('clears all', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get({ id: 1 });
    serviceLoader.get({ id: 1 }, { query: true });
    serviceLoader.find({ id: 1 });
    serviceLoader.find({ id: 1 }, { query: true });
    serviceLoader.clearAll();
    serviceLoader._cacheMap.forEach((loader) => {
      assert.deepEqual(loader._cacheMap.size, 0);
    })
  });
});
