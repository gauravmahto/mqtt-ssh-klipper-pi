import { readFile } from 'node:fs/promises';

import { Client } from 'ssh2';

import { isValidString, safeCb } from './utils.js';
import { defaultLogger as logger } from './logger.js';
import { setSwitchState } from './home-assistant.js';

import sshInfo from './configs/ssh-info.json' assert { type: 'json' };

export const ACTIONS = {

  POWER_OFF: 'power_off'

};

export const actionHandler = {

  [ACTIONS.POWER_OFF]: initiateShutDown

};

export function parseAction(data) {

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

async function initiateShutDown() {

  logger.info(`${ACTIONS.POWER_OFF} event handler invoked`);

  sshInfo.privateKey = await readFile(sshInfo.privateKeyPath);

  const conn = new Client();

  conn
    .on('ready', async () => {

      const afterMin = 10;
      const afterMSecs = (afterMin + 5) * 60 * 1000;

      conn.exec(`/usr/sbin/shutdown ${afterMin}`, (err, stream) => {

        if (err) throw err;

        async function switchOffPowerToPi() {

          await setSwitchState({
            switchName: process.env.SWITCH_NAME,
            entityId: process.env.SWITCH_ENTITY_ID,
            retryCount: 10,
            off: true
          });

        }

        handleStream(stream, conn, async () => {

          setTimeout(switchOffPowerToPi, afterMSecs);

        }, async (data, stream) => {

          conn.exec('cat /run/systemd/shutdown/scheduled', (err, stream) => {

            if (err) throw err;

            handleStream(stream);

            setTimeout(switchOffPowerToPi, afterMSecs);

          });

        });


      });

    }).connect(sshInfo);

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
