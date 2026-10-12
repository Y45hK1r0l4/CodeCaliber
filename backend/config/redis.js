import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

export const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
        
    }
});
redisClient.on('error', (err) => console.error('Redis Client Error:', err));

redisClient.on('ready', () => {
    console.log('Redis connected successfully!');
});
// client.on('error', err => console.log('Redis Client Error', err));

// await client.connect();

// await client.set('foo', 'bar');
// const result = await client.get('foo');
// console.log(result)  // >>> bar

