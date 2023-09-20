import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import process from 'node:process';

import { Client } from 'ssh2';

import { isValidString, safeCb, isNonEmptyArray } from './utils.js';
import { defaultLogger as logger } from './logger.js';
import { setSwitchState } from './home-assistant.js';
import { redisClient, getJSONDataToStore, getParsedJSONReadData } from './redis.js';
import { pendingTimeoutIdRedisId } from './constants.js';

import sshInfo from './configs/ssh-info.json' assert { type: 'json' };

sshInfo.privateKey = await readFile(sshInfo.privateKeyPath);

assert.ok(process.env.SWITCH_NAME, 'SWITCH_NAME env. variable is not provided');
assert.ok(process.env.SWITCH_ENTITY_ID, 'SWITCH_ENTITY_ID env. variable is not provided');
assert.ok(process.env.PI_SHUTDOWN_MIN, 'PI_SHUTDOWN_MIN env. variable is not provided');
assert.ok(process.env.EXTRA_WAIT_FOR_PI_SWITCH_MIN, 'EXTRA_WAIT_FOR_PI_SWITCH env. variable is not provided');

export const ACTIONS = {

  POWER_OFF: 'power_off',
  PRINT_START: 'print_start',
  PRINT_CANCEL: 'print_cancel',
  PRINT_COMPLETE: 'print_complete'

};

export const actionHandler = {

  [ACTIONS.POWER_OFF]: initiateShutDown,
  [ACTIONS.PRINT_START]: clearPendingTimeouts,
  [ACTIONS.PRINT_CANCEL]: clearPendingTimeouts,
  [ACTIONS.PRINT_COMPLETE]: () => logger.debug(`Print complete`)

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

      case ACTIONS.PRINT_COMPLETE:
        return safeCb(actionHandler[ACTIONS.PRINT_COMPLETE]);

      default:
        logger.debug(`No action identified via. passed action [${topic} - ${data}]`);

    }

  } else {

    logger.debug(`Invalid data [${data}] passed to parseAction`);

  }

}

export async function getPendingTimeouts() {

  let pendingTimeoutIds = getParsedJSONReadData(await redisClient.get(pendingTimeoutIdRedisId));

  if (!isNonEmptyArray(pendingTimeoutIds)) {

    pendingTimeoutIds = [];

  }

  return pendingTimeoutIds;

}

export async function clearPendingTimeouts() {

  logger.log(`Clearing any pending timeout and shutdowns`);

  execFnForSSH((conn) => cancelScheduleShutDown(conn));

  const pendingTimeoutIds = await getPendingTimeouts();

  for (const pendingTimeoutId of pendingTimeoutIds) {

    logger.debug(`Clearing pending timeout[ssh.js] ${pendingTimeoutId}`);

    clearTimeout(Number(pendingTimeoutId));

  }

  // Assume all of the pending timeouts are cleared and force data delete
  await redisClient.del(pendingTimeoutIdRedisId);

}

async function initiateShutDown() {

  logger.info(`${ACTIONS.POWER_OFF} event handler invoked`);

  await clearPendingTimeouts();

  execFnForSSH((conn) => scheduleShutDown(conn));

};

function scheduleShutDown(conn) {

  const afterMin = Number(process.env.PI_SHUTDOWN_MIN);
  const afterMSecs = (afterMin + Number(process.env.EXTRA_WAIT_FOR_PI_SWITCH_MIN)) * 60 * 1000;

  conn.exec(`/usr/sbin/shutdown ${afterMin}`, (err, stream) => {

    if (err) throw err;

    async function powerOffPrinterSwitch() {

      await setSwitchState({
        switchName: process.env.SWITCH_NAME,
        entityId: process.env.SWITCH_ENTITY_ID,
        retryCount: 10,
        off: true
      });

      await scheduleSelfProcessAutoKill();

    }

    handleStream(stream, conn, async () => {

      await schedulePrinterSwitchOff(powerOffPrinterSwitch, afterMSecs);

    }, async (data, stream) => {

      conn.exec('cat /run/systemd/shutdown/scheduled', async (err, stream) => {

        if (err) throw err;

        handleStream(stream);

        await schedulePrinterSwitchOff(powerOffPrinterSwitch, afterMSecs);

      });

    });


  });

}

function cancelScheduleShutDown(conn) {

  conn.exec(`/usr/sbin/shutdown -c`, (err, stream) => {

    if (err) throw err;

    handleStream(stream, conn);

  });

}

function execFnForSSH(fn) {

  const conn = new Client();

  conn
    .on('ready', async () => {

      fn(conn);

    })
    .on('error', (err) => {

      logger.error(`Failed to log-in. Error - ${err}`);

    })
    .connect(sshInfo);

  return conn;

}

async function schedulePrinterSwitchOff(powerOffPrinterSwitch, afterMSecs) {

  let pendingTimeoutIds = await getPendingTimeouts();

  pendingTimeoutIds.push(String(setTimeout(powerOffPrinterSwitch, afterMSecs)));

  await redisClient.set(pendingTimeoutIdRedisId, getJSONDataToStore(pendingTimeoutIds));

}

async function scheduleSelfProcessAutoKill(afterMs = 60000) {

  // Perform suicide
  logger.log(`Performing suicide with exit code of 99 after a few seconds`);

  let pendingTimeoutIds = await getPendingTimeouts();

  pendingTimeoutIds.push(String(setTimeout(() => process.exit(99), afterMs)));

  await redisClient.set(pendingTimeoutIdRedisId, getJSONDataToStore(pendingTimeoutIds));

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
