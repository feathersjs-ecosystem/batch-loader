
const { assert } = require('chai');
const { users } = require('./helpers/make-services');

describe('make-services-await.test.js', () => {
  it('run service calls', async () => {
    assert.deepEqual(await users.get(101), { id: 101, name: 'John' }, 'result1');
    assert.deepEqual(await users.find({ query: { id: 101 } }), [{ id: 101, name: 'John' }], 'result1');
    assert.deepEqual(await users.find({ query: { id: { $in: [101, 103, 104] } } }), [
      { id: 101, name: 'John' },
      { id: 103, name: 'Barbara' },
      { id: 104, name: 'Aubree' }
    ], 'result1');
    assert.deepEqual(await users.find(), [
      { id: 101, name: 'John' },
      { id: 102, name: 'Marshall' },
      { id: 103, name: 'Barbara' },
      { id: 104, name: 'Aubree' }
    ], 'result1');
  });
});
