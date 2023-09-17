// Import as early as possible
import 'dotenv/config';

import { connect } from 'mqtt';

import { defaultLogger as logger } from './logger.js';
import { parseAction } from './ssh.js';
import { safeParse } from './utils.js';

import mqttInfo from './configs/mqtt-info.json' assert {type: 'json'};

const protocol = 'mqtt';
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

const connectUrl = `${protocol}://${mqttInfo.host}:${mqttInfo.port}`;

const client = connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: '',
  password: '',
  reconnectPeriod: 1000,
});

client.on('connect', () => {

  logger.info('Connected');

  // client.publish(topic, 'pi4b.local connected', { qos: 0, retain: false }, (error) => {
  //   if (error) {
  //     logger.error(error);
  //   }
  // });

  for (const topic of mqttInfo.topics) {

    client.subscribe([topic], (err) => {

      if (null === err) {

        logger.info(`Subscribe to topic '${topic}'`);

      } else {

        logger.error(`Subscription failed for topic - ${topic} with error ${err}`);

      }

    });

  }

  client.on('message', async (topic, payload) => {

    if (mqttInfo.topics.includes(topic)) {

      const data = safeParse(payload.toString()) ?? payload.toString();

      logger.log(`Received Message: ${topic}. JSON data - ${data}`);

      const handler = parseAction(data);

      await handler();

    } else {

      logger.debug(`Ignoring messages on ${topic} channel`);

    }

  });

});

client.on('error', (err) => logger.error(`client.on('error') - ${err}`));

client.on('reconnect', (err) => logger.error(`Reconnect failed ${err}`));
