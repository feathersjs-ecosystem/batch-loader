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

  if (store && store.loader) {
    context.params.loader = store.loader;
    return next();
  }

  const loader = new AppLoader({ app: context.app });

  asyncLocalStorage.run({ loader }, async () => {
    context.params.loader = loader;
    return next();
  });
};

app.hooks({
  around: [initializeLoader]
})

// No need to manually pass the loader because AsyncLocalStorage
// in the initializeLoader functions automatically passes it.
const postResultsResolver = resolve({
  properties: {
    user: (value, post, context) => {
      const { loader } = context.params;
      return loader.service('users').get({ id: post.userId });
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
  const user = await loader.service('users').get({ id: userId });

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
      return loader.service('users').get({ id: post.userId });
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

## Clear loaders after mutation

Even though loaders are generally created/destroyed with each request, its good practice to clear the cache after mutations. When using `AppLoader` and `ServiceLoader`, there is only one method `clearAll()` to clear the loader caches. Because of the lazy config when using these classes, its difficult for the developer to know all of the potential ids/params combos that may be cached. Instead, the `clearAll()` method dumps the whole cache. If any subsequent calls are made to the loader for this service it will return new results.

```js
const clearLoaderCache = async (context) => {
  const loader = context.params.loader.service('users');
  loader.clearAll();
  return context;
};

app.service('posts').hooks({
  after: {
    all: [clearLoaderCache]
  }
});
```

But, you can get access to the underlying caches as well. You should use this with caution...cache invalidation is hard. If you are considering doing this, it may be best to use `DataLoader` classes directly so you can better control each loader.

```js
const clearLoaderCache = async (context) => {
  const loader = context.params.loader.service('users');
  loader._cacheMap.forEach((loader, loaderKey) => {
    // Write code that will break your app.
  });
  return context;
};

app.service('posts').hooks({
  after: {
    all: [clearLoaderCache]
  }
});
```

