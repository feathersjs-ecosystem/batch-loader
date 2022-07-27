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
  app.service('posts').get(1),
  app.service('posts').get(2),
  app.service('posts').get(3)
]);
```

is slower than

```js
app.service('posts').find({ query: { id: { $in: [1, 2, 3] } } });
```

Feathers Dataloader makes it easy and fast to write these kinds of queries. The loader handles coalescing all of the IDs into one request and mapping them back to the proper caller.

```js
const loader = new AppLoader({ app: context.app });

Promise.all([
  loader.service('posts').get({ id: 1 }),
  loader.service('posts').get({ id: 2 }),
  loader.service('posts').get({ id: 3 })
]);
```

is automatically converted to

```js
app.service('posts').find({ query: { id: { $in: [1, 2, 3] } } });
```


## Quick Start

```js
const { AppLoader } = require('feathers-dataloader');

// See Common Patterns for more information about how to better pass
// loaders from service to service.
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


// Loaders are most commonly used in resolvers like @feathersjs/schema,
// withResults, or fastJoin. See the Common Patterns section for more
// information and common usecases.
// Pass the loader to any and all service/loader calls. This maximizes
// performance by allowing the loader to reuse its cache and
// batching mechanism as much as possible.
const { resolveResult, resolve } = require('@feathersjs/schema');

const postResultsResolver = resolve({
  properties: {
    user: (value, post, context) => {
      const { loader } = context.params;
      return loader.service('users').get({ id: post.userId }, { loader });
    }
  }
});


app.service('posts').hooks({
  after: {
    all: [resolveResult(postResultsResolver)]
  }
});
```

## License

Licensed under the [MIT license](LICENSE).
