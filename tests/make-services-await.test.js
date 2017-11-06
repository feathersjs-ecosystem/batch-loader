
const { users } = require('./helpers/make-services');

describe('make-services-await.test.js', () => {
  it('run service calls', async () => {
    console.log(await users.get(101));
    console.log(await users.find({ query: { id: 101 } }));
    console.log(await users.find({ query: { id: { $in: [101, 103, 104] } } }));
    console.log(await users.find());
  });
});
