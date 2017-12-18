# feathers-plus/batch-loader

[![Build Status](https://travis-ci.org/feathers-plus/batch-loader.png?branch=master)](https://travis-ci.org/feathers-plus/batch-loader)
[![Code Climate](https://codeclimate.com/github/feathers-plus/batch-loader/badges/gpa.svg)](https://codeclimate.com/github/feathers-plus/batch-loader)
[![Test Coverage](https://codeclimate.com/github/feathers-plus/batch-loader/badges/coverage.svg)](https://codeclimate.com/github/feathers-plus/batch-loader/coverage)
[![Dependency Status](https://img.shields.io/david/feathers-plus/batch-loader.svg?style=flat-square)](https://david-dm.org/feathers-plus/batch-loader)
[![Download Status](https://img.shields.io/npm/dm/feathers-batchloader.svg?style=flat-square)](https://www.npmjs.com/package/feathers-batchloader)

> Reduce requests to backend services by batching calls and caching records.

## Installation

```
npm install @feathers-plus/batch-loader --save
```

## Documentation

Please refer to the [batch-loader documentation](https://feathers-plus.github.io/v1/batch-loader/) for more details.

## Complete Example

Here's an example of a Feathers server that uses `feathers-plus/batch-loader`. 

```js
const BatchLoader = require('@feathers-plus/batch-loader');
const { getResultsByKey, getUniqueKeys } = BatchLoader;

const usersBatchLoader = new BatchLoader(
  keys => app.service('users').find({ query: { id: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, user => user.id, '!'))
);

app.service('comments').find()
  .then(comments => Promise.all(comments.map(comment => {
    // Attach user record
    return usersBatchLoader.load(comment.userId)
      .then(user => comment.userRecord = user);
  })))
```

## License

Copyright (c) 2017 John J. Szwaronek

Licensed under the [MIT license](LICENSE).
