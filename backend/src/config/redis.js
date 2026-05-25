const { createClient } = require('redis');

const env = require('./env');

let client = null;
let connecting = false;

const initClient = async () => {
  if (!env.redisUrl || client || connecting) {
    return client;
  }

  connecting = true;
  client = createClient({ url: env.redisUrl });

  client.on('error', (error) => {
    console.warn('Redis connection error:', error?.message || error);
  });

  try {
    await client.connect();
  } catch (error) {
    console.warn('Redis connection failed:', error?.message || error);
    client = null;
  } finally {
    connecting = false;
  }

  return client;
};

const getRedisClient = async () => {
  if (!env.redisUrl) {
    return null;
  }

  if (!client) {
    await initClient();
  }

  if (!client || !client.isOpen) {
    return null;
  }

  return client;
};

const getCache = async (key) => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    return null;
  }

  try {
    return await redisClient.get(key);
  } catch (error) {
    console.warn('Redis get failed:', error?.message || error);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 60) => {
  const redisClient = await getRedisClient();
  if (!redisClient) {
    return false;
  }

  try {
    await redisClient.set(key, value, { EX: ttlSeconds });
    return true;
  } catch (error) {
    console.warn('Redis set failed:', error?.message || error);
    return false;
  }
};

module.exports = {
  getCache,
  setCache,
};
