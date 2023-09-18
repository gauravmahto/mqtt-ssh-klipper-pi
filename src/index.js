// Import as early as possible
import 'dotenv/config';

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

logger.log('Bootstrapping ...');

showStartMessage();
await bootstrap();

logger.log('Bootstrapping complete');
