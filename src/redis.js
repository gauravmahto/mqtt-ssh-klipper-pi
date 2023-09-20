import { createClient } from 'redis';

import { defaultLogger as logger } from './logger.js';

export const redisClient = createClient();

export const connect = async () => {

  redisClient.on('ready', () => logger.debug(`Redis Client Connected`));
  redisClient.on('error', err => logger.error(`Redis Client Error - ${err}`));

  await redisClient.connect();

  return redisClient;

};

export const getJSONDataToStore = (data) => JSON.stringify(data);

export const getParsedJSONReadData = (data) => {

  let parsedData;

  try {

    parsedData = JSON.parse(data);

  } catch {
  }

  return parsedData;

};
