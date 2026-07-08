const Redis = require('ioredis');
const logger = require('../utils/logger');

let client;

const connectRedis = async () => {
  client = new Redis(process.env.REDIS_URL, {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    keyPrefix: process.env.REDIS_PREFIX || 'pixelarena:'
  });

  client.on('connect', () => logger.info('Redis connecting...'));
  client.on('ready', () => logger.info('Redis ready'));
  client.on('error', err => logger.error('Redis error: ' + err.message));
  client.on('reconnecting', () => logger.warn('Redis reconnecting'));

  await client.ping();
  return client;
};

const getRedis = () => {
  if (!client) throw new Error('Redis not initialized');
  return client;
};

module.exports = { connectRedis, getRedis };
