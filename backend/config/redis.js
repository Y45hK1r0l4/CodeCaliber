import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

export const redisClient = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || undefined,
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return false; // Stop retrying after 3 attempts so it doesn't loop forever
      }
      return 1000;
    },
  },
});

redisClient.on('error', (err) => {
  // Silent or warn to prevent crash
});

redisClient.on('ready', () => {
  console.log('Redis connected successfully!');
});
