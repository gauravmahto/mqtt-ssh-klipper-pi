import { WebSocketServer } from 'ws';

import { defaultLogger as logger } from './logger.js';
import { redisClient } from './redis.js';
import { pendingTimeoutIdRedisId } from './constants.js';
import { ENUMS, ENUMS_DEFINITION } from './enums.js';

import websocketConfig from './configs/websocket-info.json' assert {type: 'json'};

const wss = new WebSocketServer({

  port: websocketConfig.port,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: websocketConfig.concurrencyLimit, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }

});

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

async function takeAction(message, ws) {

  if (message.startsWith('COMMAND-')) {

    const action = message.split('COMMAND-')[1];

    switch (action) {

      // ws message - COMMAND-CLEAN_UP_PENDING_TIMEOUTS
      case ENUMS[ENUMS_DEFINITION.CLEAN_UP_PENDING_TIMEOUTS]:

        let pendingTimeoutId = await redisClient.get(pendingTimeoutIdRedisId);

        if (null !== pendingTimeoutId) {

          logger.debug(`Clearing pending timeout[websocket.js] ${pendingTimeoutId}`);

          clearTimeout(Number(pendingTimeoutId));

          await redisClient.del(pendingTimeoutIdRedisId);

        }

        break;

      // ws message - COMMAND-LIST_PENDING_TIMEOUTS
      case ENUMS[ENUMS_DEFINITION.LIST_PENDING_TIMEOUTS]:

        ws.send(String(await redisClient.get(pendingTimeoutIdRedisId)));

        break;

    }

  }

}
