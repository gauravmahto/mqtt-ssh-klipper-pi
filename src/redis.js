import { createClient } from 'redis';

import { defaultLogger as logger } from './logger.js';
import { pendingTimeoutIdRedisId } from './constants.js';

export const redisClient = createClient();

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();

logger.log(`Pending timeouts - ${await redisClient.get(pendingTimeoutIdRedisId)}`);
