
const { assert } = require('chai');
const { BatchLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('batchLoader.test', () => {
  const app = makeApp();
  it('creates a BatchLoader', () => {
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
    batchLoader.load({ id: 1 });
    assert.deepEqual(batchLoader._options.cacheMap.size, 1);
  });

  it('returns a cached DataLoader', async () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load({ id: 1 });
    batchLoader.load({ id: 1 });
    assert.deepEqual(batchLoader._options.cacheMap.size, 1);
  });

  it('passes loaderOptions', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts'),
      loaderOptions: {
        cacheKeyFn: testFunc
      }
    });
    batchLoader.load({ id: 1 });
    const dataLoader = batchLoader._options.cacheMap.get('["id",{},"load"]');
    assert.deepEqual(dataLoader._cacheKeyFn, testFunc);
  });

  it('works with load({ id: 1 })', async () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    const defaultResult = await app.service('posts').get(1);
    const result = await batchLoader.load({ id: 1 });
    assert.deepEqual(result, defaultResult);
  });

  it('works with load({ id: [1, 2] })', async () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    const result1 = await app.service('posts').get(1);
    const result2 = await app.service('posts').get(2);
    const result = await batchLoader.load({ id: [1, 2] });
    assert.deepEqual(result, [result1, result2]);
  });

  it('works with loadMulti({ id: 1 })', async () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    const defaultResult = await app.service('posts').get(1);
    const result = await batchLoader.loadMulti({ id: 1 });
    assert.deepEqual(result, [defaultResult]);
  });

  it('works with loadMulti({ id: [1, 2] })', async () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    const result1 = await app.service('posts').get(1);
    const result2 = await app.service('posts').get(2);
    const result = await batchLoader.loadMulti({ id: [1, 2] });
    assert.deepEqual(result, [[result1], [result2]]);
  });

  it('clears by id', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load({ id: 1 });
    batchLoader.load({ id: 2 });
    batchLoader.clear({ id: 1 });
    const dataLoader = batchLoader._options.cacheMap.get('["id",{},"load"]');
    assert.deepEqual(dataLoader._cacheMap.size, 1);
  });

  it('clears params', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load({ id: 1 });
    batchLoader.load({ id: 1 }, { query: true });
    batchLoader.clear(null, { query: true });
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._cacheMap.size, 1);
    assert.deepEqual(dataLoader2._cacheMap.size, 0);
  });

  it('clears by id and params', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load({ id: 1 });
    batchLoader.load({ id: 1 }, { query: true });
    batchLoader.clear({ id: 1 }, { query: true });
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._cacheMap.size, 1);
    assert.deepEqual(dataLoader2._cacheMap.size, 0);
  });

  it('clears all', () => {
    const batchLoader = new BatchLoader({
      service: app.service('posts')
    });
    batchLoader.load({ id: 1 });
    batchLoader.load({ id: 2 });
    batchLoader.load({ id: 1 }, { query: true });
    batchLoader.load({ id: 2 }, { query: true });
    batchLoader.clear();
    const dataLoader1 = batchLoader._options.cacheMap.get('["id",{},"load"]');
    const dataLoader2 = batchLoader._options.cacheMap.get('["id",{"query":true},"load"]');
    assert.deepEqual(dataLoader1._cacheMap.size, 0);
    assert.deepEqual(dataLoader2._cacheMap.size, 0);
  });
});
