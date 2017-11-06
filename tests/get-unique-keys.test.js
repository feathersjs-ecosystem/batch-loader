
const { assert } = require('chai');
const { getUniqueKeys } = require('../lib');

describe('get-unique-keys.test.js', () => {
  it('handles 0 element array', () => {
    assert.deepEqual(getUniqueKeys([]), []);
  });

  it('handles 1 element array', () => {
    assert.deepEqual(getUniqueKeys([1]), [1]);
  });

  it('handles array with no duplicates', () => {
    assert.deepEqual(getUniqueKeys([1, 'a', 2, 'b']), [1, 'a', 2, 'b']);
  });

  it('handles array with duplicates', () => {
    assert.deepEqual(getUniqueKeys([1, 'a', 2, 'b', 2, 1, 'a', 'b']), [1, 'a', 2, 'b']);
  });
});
