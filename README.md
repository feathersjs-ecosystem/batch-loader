# feathers-batchloader

[![Build Status](https://travis-ci.org/feathers-plus/feathers-batchLoader.png?branch=master)](https://travis-ci.org/feathers-plus/feathers-batchLoader)
[![Code Climate](https://codeclimate.com/github/feathers-plus/feathers-batchLoader/badges/gpa.svg)](https://codeclimate.com/github/feathers-plus/feathers-batchLoader)
[![Test Coverage](https://codeclimate.com/github/feathers-plus/feathers-batchLoader/badges/coverage.svg)](https://codeclimate.com/github/feathers-plus/feathers-batchLoader/coverage)
[![Dependency Status](https://img.shields.io/david/feathers-plus/feathers-batchLoader.svg?style=flat-square)](https://david-dm.org/feathers-plus/feathers-batchLoader)
[![Download Status](https://img.shields.io/npm/dm/feathers-batchloader.svg?style=flat-square)](https://www.npmjs.com/package/feathers-batchloader)

> Reducs calls

## Installation

```
npm install feathers-batchloader --save
```

## Documentation

Please refer to the [feathers-batchloader documentation](http://docs.feathers-plus.com/) for more details.

## Complete Example

Here's an example of a Feathers server that uses `feathers-batchloader`. 

```js
const BatchLoader = require('feathers-batchloader');
const { getResultsByKey, getUniqueKeys } = BatchLoader;

const usersBatchLoader = new BatchLoader(
  keys => app.service('users').find({ query: { id: { $in: getUniqueKeys(keys) } } })
    .then(result => getResultsByKey(keys, result, user => user.id, '!'))
);

app.service('comments').find()
  .then(comments => comments.map(comment => {
    // Attach user record
    return usersBatchLoader.load(comment.userId)
      .then(user => comment.userRecord = user);
  }))
```

## License

Copyright (c) 2017 John J. Szwaronek

Licensed under the [MIT license](LICENSE).
