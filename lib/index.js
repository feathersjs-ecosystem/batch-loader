const DataLoader = require('dataloader');
const AppLoader = require('./apploader');
const BatchLoader = require('./batchloader');
const CacheLoader = require('./cacheloader');
const ServiceLoader = require('./serviceloader');

module.exports = {
  AppLoader,
  BatchLoader,
  CacheLoader,
  DataLoader,
  ServiceLoader
};
