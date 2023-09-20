import { connect } from 'mqtt';

import { defaultLogger as logger } from './logger.js';
import { parseAction } from './ssh.js';
import { safeParse } from './utils.js';

import mqttInfo from './configs/mqtt-info.json' assert {type: 'json'};

export async function connectMqtt() {

  const protocol = 'mqtt';
  const clientId = `mqtt_${Math.random().toString(16).slice(3)}`;

  const connectUrl = `${protocol}://${mqttInfo.host}:${mqttInfo.port}`;

  const client = connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: mqttInfo.connectTimeout,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: mqttInfo.reconnectPeriod
  });

  const mqttTopics = Object.values(mqttInfo.topics).flat();

  client.on('connect', () => {

    logger.info('MQTT connected');

    // client.publish(topic, 'pi4b.local connected', { qos: 0, retain: false }, (error) => {
    //   if (error) {
    //     logger.error(error);
    //   }
    // });

  });

  for (const key in mqttInfo.topics) {

    for (const topic of mqttInfo.topics[key]) {

      client.subscribe([topic], (err) => {

        if (null === err) {

          logger.info(`MQTT: Subscribe to topic '${key}-${topic}'`);

        } else {

          logger.error(`MQTT: Subscription failed for topic - ${key}-${topic} with error ${err}`);

        }

      });

    }

  }

  client.on('message', async (topic, payload) => {

    if (mqttTopics.includes(topic)) {

      const data = safeParse(payload.toString()) ?? payload.toString();

      logger.log(`MQTT: Received Message: ${topic}. JSON data - ${data}`);

      const handler = parseAction(data, topic);

      await handler();

    } else {

      logger.debug(`MQTT: Ignoring messages on ${topic} channel`);

    }

  });

  client.on('error', async (err) => {

    logger.error(`MQTT: Error - ${err}`);

  });

  client.on('reconnect', async () => {

    logger.error(`MQTT: Reconnected`);

  });

  client.on('close', async () => {

    logger.error(`MQTT: Closed`);

  });

  client.on('disconnect', async () => {

    logger.error(`MQTT: Disconnected`);

  });

  client.on('offline', async () => {

    logger.error(`MQTT: Offline`);

  });

  client.on('end', async () => {

    logger.error(`MQTT: End`);

  });

}
