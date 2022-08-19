const { assert } = require('chai')
const { GetLoader } = require('../lib')
const { makeApp } = require('./helpers')

const testFunc = () => {}

describe('getLoader.test', () => {
  const app = makeApp()
  it('creates a GetLoader', () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    assert.isFunction(getLoader.load)
    assert.isFunction(getLoader.clear)
    assert.isFunction(getLoader.clearAll)
    assert.isFunction(getLoader.prime)
  })

  it('takes a cacheParamsFn option', () => {
    const getLoader = new GetLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    })
    assert.deepEqual(getLoader._cacheParamsFn, testFunc)
  })

  it('returns a new promise for get', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    await getLoader.load(1)
    assert.deepEqual(getLoader._cacheMap.size, 1)
  })

  it('returns a cached promise for get', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    const load1 = await getLoader.load(1)
    const load2 = await getLoader.load(1)
    assert.deepEqual(getLoader._cacheMap.size, 1)
    assert.deepEqual(load1, load2)
  })

  it('returns a different promise for get', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    const load1 = await getLoader.load(1)
    const load2 = await getLoader.load(2)
    assert.deepEqual(getLoader._cacheMap.size, 2)
    assert.notDeepEqual(load1, load2)
  })

  it('takes cacheParamsFn argument', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    let called = false;
    await getLoader.load(1, {}, (params) => {
      called = true
      return params
    })
    assert.deepEqual(called, true)
  })

  it('clears id and params', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    await getLoader.load(1)
    await getLoader.load(1, { param: true })
    getLoader.clear(1)
    assert.deepEqual(getLoader._cacheMap.size, 1)
    getLoader.clear(1, { param: true })
    assert.deepEqual(getLoader._cacheMap.size, 0)
  })

  it('clears all', () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    getLoader.load(1)
    getLoader.load(2)
    getLoader.clearAll()
    assert.deepEqual(getLoader._cacheMap.size, 0)
  })

  it('primes the cacheMap', async () => {
    const getLoader = new GetLoader({
      service: app.service('posts')
    })
    const data = { data: true };
    getLoader.prime(1, undefined, data)
    const result = await getLoader.load(1)
    assert.deepEqual(data, result)

    getLoader.prime(1, { param: true }, data)
    const result2 = await getLoader.load(1, { param: true })
    assert.deepEqual(data, result2)
  })
})