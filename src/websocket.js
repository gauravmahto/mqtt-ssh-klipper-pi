import { WebSocketServer } from 'ws';

import { defaultLogger as logger } from './logger.js';
import { ENUMS, ENUMS_DEFINITION } from './enums.js';
import { getPendingTimeouts, clearPendingTimeouts } from './ssh.js';
import websocketConfig from './configs/websocket-server-info.js';

export const startWebSocketServer = async () => {

  const wss = getWebSocketServerInstance();

  wss.on('connection', async (ws, req) => {

    const ip = req.socket.remoteAddress;
    // Behind proxy
    const proxyIp = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim();

    ws.on('error', logger.error);

    ws.on('message', async (data) => {

      logger.log(`Received message from IP ${ip}-${proxyIp}: ${data}`);

      await takeAction(data.toString(), ws);

    });

    ws.send(`I'm Up :)`);

  });

};

function getWebSocketServerInstance() {

  return new WebSocketServer(websocketConfig);

}

async function takeAction(message, ws) {

  if (message.startsWith('COMMAND-')) {

    const action = message.split('COMMAND-')[1];

    switch (action) {

      // ws message - COMMAND-CLEAN_UP_PENDING_TIMEOUTS
      case ENUMS[ENUMS_DEFINITION.CLEAN_UP_PENDING_TIMEOUTS]:

        await clearPendingTimeouts();

        break;

      // ws message - COMMAND-LIST_PENDING_TIMEOUTS
      case ENUMS[ENUMS_DEFINITION.LIST_PENDING_TIMEOUTS]:

        ws.send(JSON.stringify(await getPendingTimeouts()));

        break;

    }

  }

}
