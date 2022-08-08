module.exports = {
  // require: 'ts-node/register',
  color: true,
  exit: true,
  bail: true,
  slow: 200,
  recursive: true,
  timeout: 10000,
  spec: ['tests/**/*.test.js'],
  watch: ['tests/**/*.test.js'],
}
