
const { assert } = require('chai');
const { FindLoader } = require('../lib');
const { makeApp } = require('./helpers');

const testFunc = () => { };

describe('findLoader.test', () => {
  const app = makeApp();
  it('creates a FindLoader', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    assert.isFunction(findLoader.load);
    assert.isFunction(findLoader.clear);
    assert.isFunction(findLoader.clearAll);
    assert.isFunction(findLoader.prime);
  });

  it('takes a cacheParamsFn option', () => {
    const findLoader = new FindLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    });
    assert.deepEqual(findLoader._options.cacheParamsFn, testFunc);
  });

  it('returns a new promise for find', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    findLoader.load({ query: true });
    assert.deepEqual(findLoader._cacheMap.size, 1);
  });

  it('returns a cached promise for find', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    const load1 = findLoader.load({ query: true });
    const load2 = findLoader.load({ query: true });
    assert.deepEqual(findLoader._cacheMap.size, 1);
    assert.deepEqual(load1, load2);
  });

  it('returns a different promise for find', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    const load1 = findLoader.load();
    const load2 = findLoader.load({ query: true });
    assert.deepEqual(findLoader._cacheMap.size, 2);
    assert.notDeepEqual(load1, load2);
  });

  it('clears params', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    findLoader.load({ query: true });
    findLoader.load({ query: false });
    findLoader.clear({ query: true });
    assert.deepEqual(findLoader._cacheMap.size, 1);
  });

  it('clears all', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    });
    findLoader.load({ query: true });
    findLoader.load({ query: false });
    findLoader.clearAll();
    assert.deepEqual(findLoader._cacheMap.size, 0);
  });
});
