import { readFile } from 'node:fs/promises';

import { Client } from 'ssh2';
import { connect } from 'mqtt';

import { defaultLogger as logger } from './logger.js';

import sshInfo from './ssh-info.json' assert { type: 'json' };
import mqttInfo from './mqtt-info.json' assert {type: 'json'};

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

const topics = [
  'klipper/moonraker/api/request',
  'klipper/moonraker/api/response',
  'klipper/moonraker/printer/info/request',
  'klipper/moonraker/printer/info/response',
  'klipper/klipper/alert',
  'klipper/alert'
];

const ACTIONS = {

  POWER_OFF: 'power_off'

};

const actionHandler = {

  [ACTIONS.POWER_OFF]: async () => { }

};

actionHandler[ACTIONS.POWER_OFF] = async () => {

  logger.info(`${ACTIONS.POWER_OFF} event handler invoked`);

  sshInfo.privateKey = await readFile(sshInfo.privateKeyPath);

  const conn = new Client();

  conn
    .on('ready', () => {

      conn.exec('/usr/sbin/shutdown 300', (err, stream) => {

        if (err) throw err;

        handleStream(stream, conn, undefined, (data, stream) => {

          conn.exec('cat /run/systemd/shutdown/scheduled', (err, stream) => {

            if (err) throw err;

            handleStream(stream);

          });

        });


      });

    }).connect(sshInfo);

  // #region - perform su and run command

  // conn
  //   .on('ready', () => {

  //     logger.log('Client :: ready');

  //     conn.exec('sudo su -', { pty: true }, (err, stream) => {

  //       if (err) throw err;

  //       let triedToLogin = false;

  //       stream
  //         .on('close', (code, signal) => {

  //           logger.debug('Stream :: close :: code: ' + code + ', signal: ' + signal);

  //           conn.end();

  //         })
  //         .on('data', (data) => {

  //           logger.info('STDOUT: ' + data);

  //           if (data.toString().includes(`root@${sudoUserName}`)) {
  //             //logged in successfully

  //             conn.exec('poweroff --help', (err, stream) => {
  //               if (err) throw err;
  //               stream.on('close', (code, signal) => {
  //                 logger.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
  //                 conn.end();
  //               }).on('data', (data) => {
  //                 logger.log('STDOUT: ' + data);
  //               }).stderr.on('data', (data) => {
  //                 logger.log('STDERR: ' + data);
  //               });
  //             });

  //           } else if (!triedToLogin) {
  //             //enter password
  //             stream.write(passwordStr + '\n');
  //             triedToLogin = true;
  //           }

  //         })
  //         .stderr.on('data', (data) => {

  //           logger.error('STDERR: ' + data);

  //         });

  //     });

  //   })
  //   .connect(sshInfo);

  // #endregion - perform su and run command

};

actionHandler[ACTIONS.POWER_OFF]();

client.on('connect', () => {

  logger.info('Connected');

  // client.publish(topic, 'pi4b.local connected', { qos: 0, retain: false }, (error) => {
  //   if (error) {
  //     logger.error(error);
  //   }
  // });

  for (const topic of topics) {

    client.subscribe([topic], (err) => {

      if (null === err) {

        logger.info(`Subscribe to topic '${topic}'`);

      } else {

        logger.error(err);

      }

    });

  }

  client.on('message', async (topic, payload) => {

    if (topics.includes(topic)) {

      const data = safeParse(payload.toString()) ?? payload.toString();

      logger.log('Received Message:', topic, data);

      const handler = parseAction(data);

      await handler();

    } else {

      logger.debug(`Ignoring messages on ${topic} channel`);

    }

  });

});

client.on('error', (err) => logger.error(`client.on('error') - ${err}`));

function safeParse(data) {

  try {

    logger.debug(`JSON to parse: ${data}`);

    return JSON.parse(data);

  } catch {

    return;

  }

}

function parseAction(data) {

  if (isValidString(data)) {

    switch (data) {

      case ACTIONS.POWER_OFF:
        return safeCb(actionHandler[ACTIONS.POWER_OFF]);

      default:
        logger.debug(`No action identified via. passed action [${data}]`);

    }

  } else {

    logger.debug(`Invalid data [${data}] passed to parseAction`);

  }

}

function isValidString(str) {

  return typeof str === 'string';

}

function isValidFunction(fn) {

  return typeof fn === 'function';

}

function safeCb(cb) {

  cb = isValidFunction(cb) ? cb : () => {

    logger.debug('No cb provided');

  };

  return cb;

}

function handleStream(stream, conn, dataHandler, errHandler, dataloggerId = 'STDOUT: ') {

  stream
    .on('close', (code, signal) => {

      logger.debug('Stream :: close :: code: ' + code + ', signal: ' + signal);

      // conn.end();

    })
    .on('data', (data) => {

      logger.info(dataloggerId + data);

      safeCb(dataHandler)(data, stream);

      return stream;

    })
    .on('end', (data) => {

      logger.debug('Connection disconnected');

    })
    .stderr.on('data', (data) => {

      logger.error('STDERR: ' + data);

      safeCb(errHandler)(data, stream);

      return stream;

    });

}
