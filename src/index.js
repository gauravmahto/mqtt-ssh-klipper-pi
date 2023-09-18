// Import as early as possible
import 'dotenv/config';

import process from 'node:process';

import { defaultLogger as logger } from './logger.js';
import { bootstrap } from './bootstrap.js';

function showStartMessage() {

  logger.warn(' ---------- Make sure to provide all of the required env. variables ---------- ');
  logger.debug(` KNOWN ENV VARS

HOME_ASSISTANT_TOKEN='homeassistant.valid.token'
SWITCH_NAME='name of switch'
SWITCH_ENTITY_ID='id of switch'
MQTT_USERNAME=''
MQTT_PASSWORD=''
PI_SHUTDOWN_MIN=10
EXTRA_WAIT_FOR_PI_SWITCH_MIN=5

`);

}

process.on('beforeExit', (code) => {

  logger.debug(`Process beforeExit event with code: ${code}`);

});

process.on('exit', (code) => {

  logger.debug(`Process exit event with code: ${code}`);

});

process.on('SIGINT', (code) => {

  logger.debug(`SIGINT: Process exit event with code: ${code}`);

  process.exit();

});

process.on('SIGUSR1', (code) => {

  logger.debug(`SIGUSR1: Process exit event with code: ${code}`);

  process.exit();

});
process.on('SIGUSR2', (code) => {

  logger.debug(`SIGUSR2: Process exit event with code: ${code}`);

  process.exit();

});

process.on('uncaughtException', (error) => {

  logger.debug(`uncaughtException: Process exit event with code: ${error}`);

  process.exit(-1);

});

logger.log('Bootstrapping ...');

showStartMessage();
await bootstrap();

logger.log('Bootstrapping complete');
