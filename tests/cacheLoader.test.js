
const { assert } = require('chai');
const { CacheLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('cacheLoader.test', () => {
  const app = makeApp();
  it('creates a CacheLoader', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    assert.isFunction(cacheLoader.get);
    assert.isFunction(cacheLoader.find);
    assert.isFunction(cacheLoader.clear);
  });

  it('takes a cacheParamsFn option', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    });
    assert.deepEqual(cacheLoader._options.cacheParamsFn, testFunc);
  });

  it('takes a cacheKeyFn option', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts'),
      cacheKeyFn: testFunc
    });
    assert.deepEqual(cacheLoader._options.cacheKeyFn, testFunc);
  });

  it('takes a cacheMap option', () => {
    const cacheMap = new Map([['posts', null]]);
    const cacheLoader = new CacheLoader({
      service: app.service('posts'),
      cacheMap
    });
    assert.deepEqual(cacheLoader._options.cacheMap.get('posts'), null);
  });

  it('returns a new promise for get', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.get(1);
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
  });

  it('returns a new promise for find', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.find(1);
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
  });

  it('returns a cached promise for get', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    const load1 = cacheLoader.get(1);
    const load2 = cacheLoader.get(1);
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
    assert.deepEqual(load1, load2);
  });

  it('returns a cached promise for find', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    const load1 = cacheLoader.find({ query: true });
    const load2 = cacheLoader.find({ query: true });
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
    assert.deepEqual(load1, load2);
  });

  it('returns a different promise for get', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    const load1 = cacheLoader.get(1);
    const load2 = cacheLoader.get(2);
    assert.deepEqual(cacheLoader._options.cacheMap.size, 2);
    assert.notDeepEqual(load1, load2);
  });

  it('returns a different promise for find', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    const load1 = cacheLoader.find();
    const load2 = cacheLoader.find({ query: true });
    assert.deepEqual(cacheLoader._options.cacheMap.size, 2);
    assert.notDeepEqual(load1, load2);
  });

  it('clears by id', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.get(1);
    cacheLoader.get(2);
    cacheLoader.clear(1);
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
  });

  it('clears params', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.get(1);
    cacheLoader.get(1, { query: true });
    cacheLoader.clear(null, { query: true });
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
  });

  it('clears by id and params', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.get(1);
    cacheLoader.get(1, { query: true });
    cacheLoader.clear(1, { query: true });
    assert.deepEqual(cacheLoader._options.cacheMap.size, 1);
  });

  it('clears all', () => {
    const cacheLoader = new CacheLoader({
      service: app.service('posts')
    });
    cacheLoader.get(1);
    cacheLoader.get(2);
    cacheLoader.get(1, { query: true });
    cacheLoader.get(2, { query: true });
    cacheLoader.find();
    cacheLoader.find({ query: true });
    cacheLoader.clear();
    assert.deepEqual(cacheLoader._options.cacheMap.size, 0);
  });
});
