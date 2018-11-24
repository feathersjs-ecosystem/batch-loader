
const { assert } = require('chai');
const BatchLoader = require('../lib');

const resultsObj = [0, 1, 2].map(id => ({ id, value: id }));
const collection1 = [0, 1, 2, 1].map(id => ({ id, value: id }));
const result1 = [
  [ { id: 0, value: 0 } ],
  [ { id: 1, value: 1 }, { id: 1, value: 1 } ],
  [ { id: 2, value: 2 } ]
];

let getResultsByKey;
let onErrorCalled;
let args;

const onError = (index, detail) => {
  onErrorCalled = true;
  // console.log(`#${index} ${detail}`);
};

describe('get-results-by-key.test.js', () => {
  beforeEach(() => {
    getResultsByKey = BatchLoader.getResultsByKey;
    onErrorCalled = false;
  });

  describe('basic tests', () => {
    it('returns a function', () => {
      assert.isFunction(getResultsByKey);
    });
  });

  describe("test ''", () => {
    beforeEach(() => {
      args = ['id', '', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], resultsObj, ...args);
      const expected = resultsObj;

      assert.deepEqual(actual, expected);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], resultsObj, ...args);
      const expected = [resultsObj[2], resultsObj[0], resultsObj[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      const actual = getResultsByKey([2, 99, 0, 98, 1, 97], resultsObj, ...args);
      const expected = [resultsObj[2], null, resultsObj[0], null, resultsObj[1], null];

      assert.deepEqual(actual, expected);
    });
  });

  describe("test '!'", () => {
    beforeEach(() => {
      args = ['id', '!', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], resultsObj, ...args);
      const expected = resultsObj;

      assert.deepEqual(actual, expected);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], resultsObj, ...args);
      const expected = [resultsObj[2], resultsObj[0], resultsObj[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      getResultsByKey([2, 99, 0, 98, 1, 97], resultsObj, ...args);

      assert(onErrorCalled, 'should not have succeeded');
    });
  });

  describe("test '[]'", () => {
    beforeEach(() => {
      args = ['id', '[]', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], collection1, ...args);
      assert.deepEqual(actual, result1);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], collection1, ...args);
      const expected = [result1[2], result1[0], result1[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      const actual = getResultsByKey([2, 99, 0, 98, 1, 97], collection1, ...args);
      const expected = [result1[2], null, result1[0], null, result1[1], null];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      const actual = getResultsByKey([2, null, 0, 98, 1, 97], collection1, ...args);
      const expected = [result1[2], null, result1[0], null, result1[1], null];

      assert.deepEqual(actual, expected);
    });
  });

  describe("test '[!]'", () => {
    beforeEach(() => {
      args = ['id', '[!]', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], collection1, ...args);
      const expected = result1;

      assert.deepEqual(actual, expected);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], collection1, ...args);
      const expected = [result1[2], result1[0], result1[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      getResultsByKey([2, 99, 0, 98, 1, 97], collection1, ...args);

      assert(onErrorCalled, 'should not have succeeded');
    });
  });

  describe("test '[]!'", () => {
    beforeEach(() => {
      args = ['id', '[]', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], collection1, ...args);
      assert.deepEqual(actual, result1);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], collection1, ...args);
      const expected = [result1[2], result1[0], result1[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      const actual = getResultsByKey([2, 99, 0, 98, 1, 97], collection1, ...args);
      const expected = [result1[2], null, result1[0], null, result1[1], null];

      assert.deepEqual(actual, expected);
    });

    it('no results', () => {
      const actual = getResultsByKey([99, 98, 97], collection1, ...args);
      const expected = [null, null, null];

      assert.deepEqual(actual, expected);
    });
  });

  describe("test '[!]!'", () => {
    beforeEach(() => {
      args = ['id', '[!]!', { onError, isStrict: true }];
    });

    it('results in key order', () => {
      const actual = getResultsByKey([0, 1, 2], collection1, ...args);
      const expected = result1;

      assert.deepEqual(actual, expected);
    });

    it('results in mixed order', () => {
      const actual = getResultsByKey([2, 0, 1], collection1, ...args);
      const expected = [result1[2], result1[0], result1[1]];

      assert.deepEqual(actual, expected);
    });

    it('results missing', () => {
      getResultsByKey([2, 99, 0, 98, 1, 97], collection1, ...args);

      assert(onErrorCalled, 'should not have succeeded');
    });
  });

  describe('test isStrict: false', () => {
    beforeEach(() => {

    });

    it("test '', no defaultElem", () => {
      const actual = getResultsByKey([2, 99, 0, 98, 1, 97], resultsObj, 'id', '', { onError });
      const expected = [resultsObj[2], null, resultsObj[0], null, resultsObj[1], null];

      assert.deepEqual(actual, expected);
    });

    it("test '[]!, no defaultElem'", () => {
      const actual = getResultsByKey([99, 98, 97], collection1, 'id', '[]!', { onError });
      const expected = [null, null, null];

      assert.deepEqual(actual, expected);
    });

    it("test '', defaultElem = []", () => {
      const actual = getResultsByKey([2, 99, 0, 98, 1, 97], resultsObj, 'id', '', { onError, defaultElem: [] });
      const expected = [resultsObj[2], [], resultsObj[0], [], resultsObj[1], []];

      assert.deepEqual(actual, expected);
    });

    it("test '[]!, defaultElem = []'", () => {
      const actual = getResultsByKey([99, 98, 97], collection1, 'id', '[]!', { onError, defaultElem: [] });
      const expected = [[], [], []];

      assert.deepEqual(actual, expected);
    });
  });
});
