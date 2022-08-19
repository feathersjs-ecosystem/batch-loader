const { assert } = require('chai')
const { ServiceLoader } = require('../lib')
const { makeApp } = require('./helpers')

const testFunc = () => {}

describe('serviceLoader.test', () => {
  const app = makeApp()
  it('creates a serviceLoader', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    assert.isFunction(serviceLoader.get)
    assert.isFunction(serviceLoader.find)
    assert.isFunction(serviceLoader.load)
  })

  it('takes a cacheParamsFn option', () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    })
    assert.deepEqual(serviceLoader._cacheParamsFn, testFunc)
  })

  it('returns a new DataLoader', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    await serviceLoader.load(1)
    assert.deepEqual(serviceLoader._cacheMap.size, 1)
  })

  it('returns a cached DataLoader', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    await serviceLoader.load(1)
    await serviceLoader.load(1)
    assert.deepEqual(serviceLoader._cacheMap.size, 1)
  })

  it('passes loader options', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts'),
      cacheKeyFn: testFunc
    })
    await serviceLoader.load(1)
    const [dataLoader] = serviceLoader._cacheMap.values()
    assert.deepEqual(dataLoader._cacheKeyFn, testFunc)
  })

  it('works with load(1)', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    const defaultResult = await app.service('posts').get(1)
    const result = await serviceLoader.load(1)
    assert.deepEqual(result, defaultResult)
  })

  it('works with load([1, 2])', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    const defaultResult = await Promise.all([
      app.service('posts').get(1),
      app.service('posts').get(2),
    ])
    const result = await serviceLoader.load([1, 2])
    assert.deepEqual(result, defaultResult)
  })

  it('works with key("key").load()', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    const defaultResult = await app.service('posts').get(1)
    const result = await serviceLoader.key('body').load('John post')
    assert.deepEqual(result, defaultResult)
  })

  it('works with multi("key").load()', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('comments')
    })
    const result = await serviceLoader.multi('postId').load(1)
    assert.deepEqual(result.length, 3)
  })

  it('clears all', async () => {
    const serviceLoader = new ServiceLoader({
      service: app.service('posts')
    })
    await serviceLoader.load(1)
    await serviceLoader.get(1)
    await serviceLoader.find()
    serviceLoader.clearAll()
    assert.deepEqual(serviceLoader._cacheMap.size, 0)
  })
})
