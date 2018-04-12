
const { assert } = require('chai');
const { makeService } = require('./helpers/make-services');
const { loaderFactory } = require('../lib');

const usersStore = [
  { id: 101, name: 'Chris' },
];

describe('loader-factory.test.js', () => {

  it('works without pagination', () => {
    const users = makeService(usersStore, 'users', { returnPageObject: false });
    const context = { _loaders: { user: {} } };
    context._loaders.user.id = loaderFactory(users, 'id', false)(context);

    return context._loaders.user.id.load(101)
      .then((user) => {
        assert.deepEqual(usersStore[0], user);
      });
  });

  it('works with pagination', () => {
    const users = makeService(usersStore, 'users', { returnPageObject: true });
    const context = { _loaders: { user: {} } };
    context._loaders.user.id = loaderFactory(users, 'id', false)(context);

    return context._loaders.user.id.load(101)
      .then((user) => {
        assert.deepEqual(usersStore[0], user);
      });
  });

});
