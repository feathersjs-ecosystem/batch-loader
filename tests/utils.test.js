const { assert, expect } = require('chai')
const {
  uniqueKeys,
  uniqueResults,
  uniqueResultsMulti,
  stableStringify,
  defaultCacheParamsFn,
  defaultCacheKeyFn
} = require('../lib/utils')

describe('appLoader.test', () => {
  it('uniqueKeys dedupes keys', () => {
    const keys = [1, 1, 2, 2]
    const newKeys = uniqueKeys(keys)
    assert.deepEqual(newKeys, [1, 2])
  })

  it('uniqueResults returns proper number of results', () => {
    const keys = [1, 2]
    const results = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const newResults = uniqueResults(keys, results)
    assert.deepEqual(newResults, [{ id: 1 }, { id: 2 }])
  })

  it('uniqueResults returns results in proper order', () => {
    const keys = [1, 2]
    const results = [{ id: 2 }, { id: 1 }]
    const newResults = uniqueResults(keys, results)
    assert.deepEqual(newResults, [{ id: 1 }, { id: 2 }])
  })

  it('uniqueResults returns a default value', () => {
    const keys = [1, 2, 3]
    const results = [{ id: 1 }, { id: 2 }]
    const newResults = uniqueResults(keys, results)
    assert.deepEqual(newResults, [{ id: 1 }, { id: 2 }, null])
  })

  it('uniqueResultsMulti returns proper number of results', () => {
    const keys = [1, 2]
    const results = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const newResults = uniqueResultsMulti(keys, results)
    assert.deepEqual(newResults, [[{ id: 1 }], [{ id: 2 }]])
  })

  it('uniqueResultsMulti returns results in the proper order', () => {
    const keys = [1, 2]
    const results = [{ id: 2 }, { id: 1 }]
    const newResults = uniqueResultsMulti(keys, results)
    assert.deepEqual(newResults, [[{ id: 1 }], [{ id: 2 }]])
  })

  it('uniqueResultsMulti returns a default value', () => {
    const keys = [1, 2, 3]
    const results = [{ id: 1 }, { id: 2 }]
    const newResults = uniqueResultsMulti(keys, results)
    assert.deepEqual(newResults, [[{ id: 1 }], [{ id: 2 }], null])
  })

  it('stableStringify returns a consistent result', () => {
    const params1 = stableStringify({
      id: 1,
      array: [
        { id: 1, param: true },
        { param: true, id: 2 }
      ]
    })
    const params2 = stableStringify({
      array: [
        { param: true, id: 1 },
        { id: 2, param: true }
      ],
      id: 1
    })
    assert.deepEqual(params1, params2)
  })

  it('stableStringify throws with a function param', () => {
    const fn = () => stableStringify({ func: () => {} })
    expect(fn).to.throw()
  })

  it('defaultCacheKeyFn coerces things to string', () => {
    const _id = {
      toString() {
        return '1'
      }
    }

    assert.deepEqual(defaultCacheKeyFn(1), '1')
    assert.deepEqual(defaultCacheKeyFn('1'), '1')
    assert.deepEqual(defaultCacheKeyFn(_id), '1')
  })

  it('defaultCacheParamsFn strips out functions', () => {
    const func = () => {}
    const name = 'DaddyWarbucks'
    const cacheParams = defaultCacheParamsFn({
      name,
      func,
      props: {
        func,
        name,
        array: [{ func, name }]
      }
    })

    assert.deepEqual(cacheParams.name, name)
    assert.deepEqual(cacheParams.props.name, name)
    assert.deepEqual(cacheParams.props.array[0].name, name)

    assert.deepEqual(cacheParams.func, undefined)
    assert.deepEqual(cacheParams.props.func, undefined)
    assert.deepEqual(cacheParams.props.array[0].func, undefined)
  })
})
