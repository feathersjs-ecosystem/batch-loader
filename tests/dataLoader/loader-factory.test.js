
const { assert } = require('chai');
const { users } = require('../helpers');
const { DataLoader } = require('../../lib');
const loaderFactory = DataLoader.loaderFactory;

describe('loader-factory.test.js', () => {
  it('can load an entity', () => {
    const context = { _loaders: { user: {} } };
    context._loaders.user.id = loaderFactory(users, 'id', false)(context);

    return context._loaders.user.id.load(101)
      .then((user) => {
        assert.deepEqual({ id: 101, name: 'John' }, user);
      });
  });
});
