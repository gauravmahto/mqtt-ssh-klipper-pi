import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import process from 'node:process';

import { Client } from 'ssh2';

import { isValidString, safeCb } from './utils.js';
import { defaultLogger as logger } from './logger.js';
import { setSwitchState } from './home-assistant.js';
import { redisClient } from './redis.js';
import { pendingTimeoutIdRedisId } from './constants.js';

import sshInfo from './configs/ssh-info.json' assert { type: 'json' };

assert.ok(process.env.SWITCH_NAME, 'SWITCH_NAME env. variable is not provided');
assert.ok(process.env.SWITCH_ENTITY_ID, 'SWITCH_ENTITY_ID env. variable is not provided');
assert.ok(process.env.PI_SHUTDOWN_MIN, 'PI_SHUTDOWN_MIN env. variable is not provided');
assert.ok(process.env.EXTRA_WAIT_FOR_PI_SWITCH_MIN, 'EXTRA_WAIT_FOR_PI_SWITCH env. variable is not provided');

export const ACTIONS = {

  POWER_OFF: 'power_off',
  PRINT_START: 'print_start',
  PRINT_CANCEL: 'print_cancel'

};

export const actionHandler = {

  [ACTIONS.POWER_OFF]: initiateShutDown,
  [ACTIONS.PRINT_START]: clearPendingTimeouts,
  [ACTIONS.PRINT_CANCEL]: clearPendingTimeouts

};

export function parseAction(data, topic) {

  if (isValidString(data)) {

    switch (data) {

      case ACTIONS.PRINT_START:
        return safeCb(actionHandler[ACTIONS.PRINT_START]);

      case ACTIONS.PRINT_CANCEL:
        return safeCb(actionHandler[ACTIONS.PRINT_CANCEL]);

      case ACTIONS.POWER_OFF:
        return safeCb(actionHandler[ACTIONS.POWER_OFF]);

      default:
        logger.debug(`No action identified via. passed action [${topic} - ${data}]`);

    }

  } else {

    logger.debug(`Invalid data [${data}] passed to parseAction`);

  }

}

async function initiateShutDown() {

  logger.info(`${ACTIONS.POWER_OFF} event handler invoked`);

  sshInfo.privateKey = await readFile(sshInfo.privateKeyPath);

  await clearPendingTimeouts();

  const conn = new Client();

  conn
    .on('ready', async () => {

      const afterMin = Number(process.env.PI_SHUTDOWN_MIN);
      const afterMSecs = (afterMin + Number(process.env.EXTRA_WAIT_FOR_PI_SWITCH_MIN)) * 60 * 1000;

      conn.exec(`/usr/sbin/shutdown ${afterMin}`, (err, stream) => {

        if (err) throw err;

        async function switchOffPowerToPi() {

          await setSwitchState({
            switchName: process.env.SWITCH_NAME,
            entityId: process.env.SWITCH_ENTITY_ID,
            retryCount: 10,
            off: true
          });

          // Perform suicide
          process.exit(-99);

        }

        handleStream(stream, conn, async () => {

          await schedulePowerSwitchOff(switchOffPowerToPi, afterMSecs);

        }, async (data, stream) => {

          conn.exec('cat /run/systemd/shutdown/scheduled', async (err, stream) => {

            if (err) throw err;

            handleStream(stream);

            await schedulePowerSwitchOff(switchOffPowerToPi, afterMSecs);

          });

        });


      });

    })
    .on('error', (err) => {

      logger.error(`Failed to log-in using provided ssh key. ${err}`);

    })
    .connect(sshInfo);

  // #region - perform su and run command

  // conn
  //   .on('ready', () => {

  //     logger.log(`Client :: ready`);

  //     conn.exec('sudo su -', { pty: true }, (err, stream) => {

  //       if (err) throw err;

  //       let triedToLogin = false;

  //       stream
  //         .on('close', (code, signal) => {

  //          logger.debug(`Stream :: close :: code: ${code}, signal: ${signal}`);

  //           conn.end();

  //         })
  //         .on('data', (data) => {

  //           logger.info(`STDOUT: ${data}`);

  //           if (data.toString().includes(`root@${sudoUserName}`)) {
  //             //logged in successfully

  //             conn.exec('poweroff --help', (err, stream) => {
  //               if (err) throw err;
  //               stream.on('close', (code, signal) => {
  //                logger.log(`Stream :: close :: code: ${code}, signal: ${signal}`);
  //                 conn.end();
  //               }).on('data', (data) => {
  //                 logger.log(`STDOUT: ${data}`);
  //               }).stderr.on('data', (data) => {
  //                 logger.log(`STDERR: ${data}`);
  //               });
  //             });

  //           } else if (!triedToLogin) {
  //             //enter password
  //             stream.write(passwordStr + '\n');
  //             triedToLogin = true;
  //           }

  //         })
  //         .stderr.on('data', (data) => {

  //           logger.error(`STDERR: ${data}`);

  //         });

  //     });

  //   })
  //   .connect(sshInfo);

  // #endregion - perform su and run command

};

async function clearPendingTimeouts() {

  let pendingTimeoutId = await redisClient.get(pendingTimeoutIdRedisId);

  if (null !== pendingTimeoutId) {

    logger.debug(`Clearing pending timeout[ssh.js] ${pendingTimeoutId}`);

    clearTimeout(Number(pendingTimeoutId));

    await redisClient.del(pendingTimeoutIdRedisId);

  }

}

async function schedulePowerSwitchOff(switchOffPowerToPi, afterMSecs) {

  await clearPendingTimeouts();

  const pendingTimeoutId = String(setTimeout(switchOffPowerToPi, afterMSecs));
  await redisClient.set(pendingTimeoutIdRedisId, pendingTimeoutId);

}

function handleStream(stream, conn, dataHandler, errHandler, dataloggerId = 'STDOUT: ') {

  stream
    .on('close', (code, signal) => {

      logger.debug(`Stream :: close :: code: ${code}, signal: ${signal}`);

      // conn.end();

    })
    .on('data', (data) => {

      logger.info(`${dataloggerId} ${data}`);

      safeCb(dataHandler)(data, stream);

      return stream;

    })
    .on('end', (data) => {

      logger.debug(`Connection disconnected`);

    })
    .stderr.on('data', (data) => {

      logger.error(`STDERR: ${data}`);

      safeCb(errHandler)(data, stream);

      return stream;

    });

}
