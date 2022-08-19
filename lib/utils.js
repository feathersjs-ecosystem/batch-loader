const isObject = (module.exports.isObject = (obj) => {
  return obj && typeof obj === 'object' && !Array.isArray(obj)
})

module.exports.stableStringify = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') {
      throw new Error(
        'Cannot stringify non JSON value. The params returned from the cacheParamsFn bust be serializable.'
      )
    }

    if (isObject(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = value[key]
          return result
        }, {})
    }

    return value
  })
}

module.exports.defaultCacheParamsFn = (params) => {
  if (!params) {
    return {}
  }
  return params;
  // return ['query', 'user', 'authentication'].reduce((accum, key) => {
  //   if (Object.prototype.hasOwnProperty.call(params, key)) {
  //     accum[key] = params[key]
  //   }
  //   return accum
  // }, {})
}

module.exports.defaultCacheKeyFn = (id) => {
  return id && id.toString ? id.toString() : String(id)
}

module.exports.uniqueKeys = (keys) => {
  const found = {}
  const unique = []

  for (let index = 0, length = keys.length; index < length; ++index) {
    if (!found[keys[index]]) {
      found[keys[index]] = unique.push(keys[index])
    }
  }

  return unique
}

module.exports.uniqueResults = (keys, result, idKey = 'id', defaultValue = null) => {
  const serviceResults = result.data || result
  const found = {}
  const results = []

  for (let index = 0, length = serviceResults.length; index < length; ++index) {
    const result = serviceResults[index]
    const id = result[idKey]
    found[id] = result
  }

  for (let index = 0, length = keys.length; index < length; ++index) {
    results.push(found[keys[index]] || defaultValue)
  }

  return results
}

module.exports.uniqueResultsMulti = (keys, result, idKey = 'id', defaultValue = null) => {
  const serviceResults = result.data || result
  const found = {}
  const results = []

  for (let index = 0, length = serviceResults.length; index < length; ++index) {
    const result = serviceResults[index]
    const id = result[idKey]
    if (found[id]) {
      found[id].push(result)
    } else {
      found[id] = [result]
    }
  }

  for (let index = 0, length = keys.length; index < length; ++index) {
    results.push(found[keys[index]] || defaultValue)
  }

  return results
}
