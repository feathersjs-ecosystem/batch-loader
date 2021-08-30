
const { assert } = require('chai');
const { ServiceLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('serviceLoader.test', () => {
  const app = makeApp();
  it('creates a ServiceLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    assert.isFunction(serviceLoader.get);
    assert.isFunction(serviceLoader.find);
    assert.isFunction(serviceLoader.load);
    assert.isFunction(serviceLoader.loadMulti);
    assert.isFunction(serviceLoader.clear);
  });

  it('returns a new BatchLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.load(1);
    const batchLoader = serviceLoader._batchLoader;
    assert.deepEqual(batchLoader._options.cache.size, 1);
  });

  it('returns a new CacheLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get(1);
    const cacheLoader = serviceLoader._cacheLoader;
    assert.deepEqual(cacheLoader._options.cache.size, 1);
  });

  it('passes batchOptions', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      batchOptions: {
        cacheParamsFn: testFunc
      }
    });
    serviceLoader.load(1);
    const batchLoader = serviceLoader._batchLoader;
    assert.deepEqual(batchLoader._options.cacheParamsFn, testFunc);
  });

  it('passes cacheOptions', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      cacheOptions: {
        cacheParamsFn: testFunc
      }
    });
    serviceLoader.load(1);
    const cacheLoader = serviceLoader._cacheLoader;
    assert.deepEqual(cacheLoader._options.cacheParamsFn, testFunc);
  });

  it('clears by id', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get(1);
    serviceLoader.load(1);
    serviceLoader.get(2);
    serviceLoader.load(2);
    serviceLoader.clear(1);
    const cacheLoader = serviceLoader._cacheLoader;
    const batchLoader = serviceLoader._batchLoader;
    assert.deepEqual(cacheLoader._options.cache.size, 1);
    assert.deepEqual(batchLoader._options.cache.size, 1);
  });

  it('clears params', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get(1);
    serviceLoader.get(1, { query: true });
    serviceLoader.load(1);
    serviceLoader.load(1, { query: true });
    serviceLoader.clear(null, { query: true });
    const cacheLoader = serviceLoader._cacheLoader;
    const batchLoader = serviceLoader._batchLoader;
    const dataLoader1 = batchLoader._options.cache.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cache.get('["id",{"query":true},"load"]');
    assert.deepEqual(cacheLoader._options.cache.size, 1);
    assert.deepEqual(dataLoader1._promiseCache.size, 1);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
  });

  it('clears by id and params', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get(1);
    serviceLoader.get(1, { query: true });
    serviceLoader.load(1);
    serviceLoader.load(1, { query: true });
    serviceLoader.clear(1, { query: true });
    const cacheLoader = serviceLoader._cacheLoader;
    const batchLoader = serviceLoader._batchLoader;
    const dataLoader1 = batchLoader._options.cache.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cache.get('["id",{"query":true},"load"]');
    assert.deepEqual(cacheLoader._options.cache.size, 1);
    assert.deepEqual(dataLoader1._promiseCache.size, 1);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
  });

  it('clears all', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    });
    serviceLoader.get(1);
    serviceLoader.get(1, { query: true });
    serviceLoader.find();
    serviceLoader.find({ query: true });
    serviceLoader.load(1);
    serviceLoader.load(1, { query: true });
    serviceLoader.loadMulti(1);
    serviceLoader.loadMulti(1, { query: true });
    serviceLoader.clear();
    const cacheLoader = serviceLoader._cacheLoader;
    const batchLoader = serviceLoader._batchLoader;
    const dataLoader1 = batchLoader._options.cache.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cache.get('["id",{"query":true},"load"]');
    const dataLoader3 = batchLoader._options.cache.get('["id",{"query":true},"loadMulti"]');
    assert.deepEqual(cacheLoader._options.cache.size, 0);
    assert.deepEqual(dataLoader1._promiseCache.size, 0);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
    assert.deepEqual(dataLoader3._promiseCache.size, 0);
  });
});
