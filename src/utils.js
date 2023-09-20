import { defaultLogger as logger } from './logger.js';

export function isValidString(str) {

  return typeof str === 'string';

}

export function isValidFunction(fn) {

  return typeof fn === 'function';

}

export function safeCb(cb) {

  cb = isValidFunction(cb) ? cb : () => {

    logger.debug(`No cb provided`);

  };

  return cb;

}

export function safeParse(data) {

  try {

    logger.debug(`JSON to parse: ${data}`);

    return JSON.parse(data);

  } catch {

    return;

  }

}

export async function waitForSecs(seconds = 1) {

  await new Promise((res) => setTimeout(res, seconds * 1000));

}

export function isValidArray(obj) {

  return Array.isArray(obj);

}

export function isNonEmptyArray(obj) {

  return (isValidArray(obj) &&
    obj.length > 0);

}
