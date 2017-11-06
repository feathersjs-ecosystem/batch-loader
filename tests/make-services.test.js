
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
        console.log(result1);
        console.log(result2);
        console.log(result3);
        console.log(result);
      })
      .catch(err => console.log(err));
  });
});
