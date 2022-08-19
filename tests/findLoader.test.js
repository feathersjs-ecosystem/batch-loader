const { assert } = require('chai')
const { FindLoader } = require('../lib')
const { makeApp } = require('./helpers')

const testFunc = () => {}

describe('findLoader.test', () => {
  const app = makeApp()
  it('creates a FindLoader', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    assert.isFunction(findLoader.load)
    assert.isFunction(findLoader.clear)
    assert.isFunction(findLoader.clearAll)
    assert.isFunction(findLoader.prime)
  })

  it('takes a cacheParamsFn option', () => {
    const findLoader = new FindLoader({
      service: app.service('posts'),
      cacheParamsFn: testFunc
    })
    assert.deepEqual(findLoader._cacheParamsFn, testFunc)
  })

  it('returns a new promise for find', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    await findLoader.load({ query: true })
    assert.deepEqual(findLoader._cacheMap.size, 1)
  })

  it('returns a cached promise for find', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    const load1 = await findLoader.load({ query: true })
    const load2 = await findLoader.load({ query: true })
    assert.deepEqual(findLoader._cacheMap.size, 1)
    assert.deepEqual(load1, load2)
  })

  it('returns a different promise for find', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    const load1 = await findLoader.load()
    const load2 = await findLoader.load({ query: true })
    assert.deepEqual(findLoader._cacheMap.size, 2)
    assert.notDeepEqual(load1, load2)
  })

  it('takes cacheParamsFn argument', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    let called = false
    await findLoader.load({ query: true }, (params) => {
      called = true
      return params
    })
    assert.deepEqual(called, true)
  })

  it('clears params', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    await findLoader.load({ query: true })
    await findLoader.load({ query: false })
    findLoader.clear({ query: true })
    assert.deepEqual(findLoader._cacheMap.size, 1)
  })

  it('clears all', () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    findLoader.load({ query: true })
    findLoader.load({ query: false })
    findLoader.clearAll()
    assert.deepEqual(findLoader._cacheMap.size, 0)
  })

  it('primes the cacheMap', async () => {
    const findLoader = new FindLoader({
      service: app.service('posts')
    })
    const data = [{ data: true }]
    findLoader.prime({ query: true }, data)
    const result = await findLoader.load({ query: true })
    assert.deepEqual(data, result)
  })
})
