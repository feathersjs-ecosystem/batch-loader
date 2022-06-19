const DataLoader = require('dataloader');
const AppLoader = require('./appLoader');
const BatchLoader = require('./batchLoader');
const CacheLoader = require('./cacheLoader');
const ServiceLoader = require('./serviceLoader');

module.exports = {
  AppLoader,
  BatchLoader,
  CacheLoader,
  DataLoader,
  ServiceLoader
};
