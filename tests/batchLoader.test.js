
const { assert } = require('chai');
const { BatchLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('batchLoader.test', () => {
  const app = makeApp();
  it('creates an BatchLoader', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    assert.isFunction(batchLoader.load);
    assert.isFunction(batchLoader.loadMulti);
    assert.isFunction(batchLoader.clear);
  });

  it('takes a cacheParamsFn option', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    });
    assert.deepEqual(batchLoader._options.cacheParamsFn, testFunc);
  });

  it('takes a cacheMap option', () => {
    const cacheMap = new Map([['posts', null]]);
    const batchLoader = new BatchLoader({
      service: app.service('posts'),
      cacheMap
    });
    assert.deepEqual(batchLoader._options.cacheMap.get('posts'), null);
  });

  it('returns a new DataLoader', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load(1);
    assert.deepEqual(batchLoader._options.cacheMap.size, 1);
  });

  it('returns a cached DataLoader', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    const load1 = batchLoader.load(1);
    const load2 = batchLoader.load(1);
    assert.deepEqual(batchLoader._options.cacheMap.size, 1);
    assert.deepEqual(load1, load2);
  });

  it('passes loaderOptions', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts'),
      loaderOptions: {
        cacheKeyFn: testFunc
      }
    });
    batchLoader.load(1);
    const dataLoader = batchLoader._options.cacheMap.get('["id",{},"load"]');
    assert.deepEqual(dataLoader._options.cacheKeyFn, testFunc);
  });

  it('clears by id', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load(1);
    batchLoader.load(2);
    batchLoader.clear(1);
    const dataLoader = batchLoader._options.cacheMap.get('["id",{},"load"]');
    assert.deepEqual(dataLoader._promiseCache.size, 1);
  });

  it('clears params', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load(1);
    batchLoader.load(1, { query: true });
    batchLoader.clear(null, { query: true });
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._promiseCache.size, 1);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
  });

  it('clears by id and params', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load(1);
    batchLoader.load(1, { query: true });
    batchLoader.clear(1, { query: true });
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._promiseCache.size, 1);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
  });

  it('clears all', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load(1);
    batchLoader.load(2);
    batchLoader.load(1, { query: true });
    batchLoader.load(2, { query: true });
    batchLoader.clear();
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._promiseCache.size, 0);
    assert.deepEqual(dataLoader2._promiseCache.size, 0);
  });
});
