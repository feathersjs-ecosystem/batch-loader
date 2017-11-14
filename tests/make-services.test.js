
const { assert } = require('chai');
const { users } = require('./helpers/make-services');

let result1, result2, result3;

describe('make-services.test.js', () => {
  it('run service calls', () => {
    return users.get(101)
      .then(result => {
        result1 = result;

        return users.find({ query: { id: 101 } });
      })
      .then(result => {
        result2 = result;

        return users.find({ query: { id: { $in: [101, 103, 104] } } });
      })
      .then(result => {
        result3 = result;

        return users.find();
      })
      .then(result => {
        assert.deepEqual(result1, { id: 101, name: 'John' }, 'result1');
        assert.deepEqual(result2, [{ id: 101, name: 'John' }], 'result1');
        assert.deepEqual(result3, [
          { id: 101, name: 'John' },
          { id: 103, name: 'Barbara' },
          { id: 104, name: 'Aubree' }
        ], 'result1');
        assert.deepEqual(result, [
          { id: 101, name: 'John' },
          { id: 102, name: 'Marshall' },
          { id: 103, name: 'Barbara' },
          { id: 104, name: 'Aubree' }
        ], 'result1');
      })
      .catch(err => console.log(err));
  });
});
