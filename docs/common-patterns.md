## Reusing loaders

Pass the loader to any and all service calls. This maximizes performance by allowing the loader to re-use its cache and batching mechanism as much as possible. If you are using Feathers v5, you can also use Node's `AsyncLocalStorage` mechanism to automatically pass the loader from service to service.

```js
const { AppLoader } = require('feathers-dataloader');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const initializeLoader = async (context, next) => {
  if (context.params.loader) {
    return next();
  }

  const store = asyncLocalStorage.getStore();

  if (store.loader) {
    context.params.loader = store.loader;
    return next();
  }

  const loader = new AppLoader({ app: context.app });

  asyncLocalStorage.run({ loader }, async () => {
    context.params.loader = loader;
    next();
  });
};

app.hooks({
  before: {
    all: [initializeLoader]
  }
})

// No need to manually pass the loader because AsyncLocalStorage
// in the initializeLoader functions automatically passes it.
const postResultsResolver = resolve({
  properties: {
    user: (value, post, context) => {
      const { loader } = context.params;
      return loader.service('users').load({ id: post.userId });
    }
  }
});

app.service('posts').hooks({
  after: {
    all: [resolveResult(postResultsResolver)]
  }
});
```

## Use loaders EVERYWHERE

The more the loader is used, the better performance can be. This is generally accomplished by passing the loader from service to service in hooks and resolvers. But, you can use loaders in other places which will also lead to performance gains.

```js
const validateUserId = async (context) => {
  const { loader } = context.params;
  const { userId } = context.data;

  // Note we use the loader to lookup this user
  const user = await loader.service('users').load({ id: userId });

  if (!user) {
    throw new Error('Invalid userId');
  }

  return context;
};

const postResultsResolver = resolve({
  properties: {
    user: (value, post, context) => {
      const { loader } = context.params;
      // We get user for free here! The loader is already cached
      // because we used it in the validateUserId before hook
      return loader.service('users').load({ id: post.userId });
    }
  }
});

app.service('posts').hooks({
  before: {
    create: [validateUserId],
    update: [validateUserId],
    patch: [validateUserId],
  },
  after: {
    all: [resolveResult(postResultsResolver)]
  }
});
```
