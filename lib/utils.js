const isObject = module.exports.isObject = (obj) => {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
};

module.exports.stableStringify = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') {
      throw new Error('Cannot stringify non JSON value');
    }

    if (isObject(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = value[key];
          return result;
        }, {});
    }

    return value;
  });
};

module.exports.defaultCacheParamsFn = (params) => {
  if (!params) {
    return {};
  }
  return [
    'query',
    'user',
    'authentication',
    'paginate'
  ].reduce((accum, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      accum[key] = params[key];
    }
    return accum;
  }, {});
};

const defaultCacheKeyFn = (id) => {
  return id && id.toString ? id.toString() : String(id);
};

module.exports.defaultCacheKeyFn = defaultCacheKeyFn;

module.exports.getIdOptions = (idObject, defaultProp) => {
  if (isObject(idObject)) {
    const entries = Object.entries(idObject);

    if (entries.length !== 1) {
      throw new Error(
        'When using an object as an id, the object must have exactly one property where the property name is the name of the foreign key. For example, { post_id: "123" } or { post_id: ["123", "456"] }'
      );
    }

    return entries[0];
  }

  return [defaultProp, idObject];
};

module.exports.uniqueKeys = (keys) => {
  const found = {};
  const unique = [];

  for (let index = 0, length = keys.length; index < length; ++index) {
    if (!found[keys[index]]) {
      found[keys[index]] = unique.push(keys[index]);
    }
  }

  return unique;
};

module.exports.uniqueResults = (keys, result, idProp = 'id', defaultValue = null) => {
  const serviceResults = result.data || result;
  const serviceResultsHash = {};
  for (let index = 0, length = serviceResults.length; index < length; ++index) {
    const recordKey = serviceResults[index][idProp];
    serviceResultsHash[recordKey] = serviceResults[index];
  }
  const results = [];
  for (let index = 0, length = keys.length; index < length; ++index) {
    results.push(serviceResultsHash[keys[index]] || defaultValue)
  }
  return results;
};

module.exports.uniqueResultsMulti = (keys, result, idProp = 'id', defaultValue = null) => {
  const serviceResults = result.data || result;
  const serviceResultsHash = {};
  for (let index = 0, length = serviceResults.length; index < length; ++index) {
    const recordKey = serviceResults[index][idProp];
    if (serviceResultsHash[recordKey]) {
      serviceResultsHash[recordKey].push(serviceResults[index])
    } else {
      serviceResultsHash[recordKey] = [serviceResults[index]];
    }
  }
  const results = [];
  for (let index = 0, length = keys.length; index < length; ++index) {
    results.push(serviceResultsHash[keys[index]] || defaultValue)
  }
  return results;
};
