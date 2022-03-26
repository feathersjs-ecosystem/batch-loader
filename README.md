# feathers-ecosystem/feathers-dataloader

> Reduce requests to backend services by batching calls and caching records.

## Installation

```
npm install feathers-dataloader --save
```

## Documentation

Please refer to the documentation for more information.
- [Documentation](./docs/index.md) - Definitions for the classes exported from this library
- [Common Patterns](./docs/common-patterns.md) - Common patterns and best practices
- [Guide](./docs/guide.md) - Detailed information about how loading, caching, batching works

## TLDR

```js
Promise.all([
  posts.get(1),
  posts.get(2),
  posts.find({ query: { id: { $in: [3, 4] } } }),
  posts.get(5),
]);
```

is slower than

```js
posts.find({ query: { id: { $in: [1, 2, 3, 4, 5] } } });
```

Feathers Dataloader makes it easy and fast to write these kinds of queries.

```js
const loader = new AppLoader({ app: context.app });

Promise.all([
  loader.service('posts').load(1),
  loader.service('posts').load(2),
  loader.service('posts').load([3, 4]),
  loader.service('posts').load(5),
]);
```

is automatically converted to

```js
posts.find({ query: { id: { $in: [1, 2, 3, 4, 5] } } });
```


## Quick Start

```js
const { AppLoader } = require('feathers-dataloader');

// See Common Patterns for more information about how to better pass
// loaders from service to service
const initializeLoader = context => {
  if (context.params.loader) {
    return context;
  }
  context.params.loader = new AppLoader({ app: context.app });
  return context;
}

// Use this app hook to ensure that a loader is always configured in
// your service hooks. You can now access context.params.loader in any hook.
app.hooks({
  before: {
    all: [initializeLoader]
  }
})

// Pass the loader to any and all service calls. This maximizes
// performance by allowing the loader to reuse its cache and
// batching mechanism as much as possible.
const withResults = withResults({
  user: (post, context) => {
    const { loader } = context.params;
    return loader.service('users').load(post.userId, { loader });
  }
});


app.service('posts').hooks({
  after: {
    all: [withResults]
  }
});
```

## License

Copyright (c) 2017 John J. Szwaronek

Licensed under the [MIT license](LICENSE).
