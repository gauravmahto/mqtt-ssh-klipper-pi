import { createClient } from 'redis';

import { defaultLogger as logger } from './logger.js';
import { pendingTimeoutIdRedisId } from './constants.js';

export const redisClient = createClient();

export const connect = async () => {

  redisClient.on('error', err => console.log('Redis Client Error', err));

  await redisClient.connect();

  logger.debug(`Pending timeouts - ${await redisClient.get(pendingTimeoutIdRedisId)}`);

  return redisClient;

};
