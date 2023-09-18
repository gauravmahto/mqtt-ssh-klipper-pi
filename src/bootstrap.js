import { connect } from './redis.js';
import { startWebSocketServer } from './websocket.js';
import { connectMqtt } from './mqtt.js';

export async function bootstrap() {

  await connectToRedis();
  await bootstrapWebSocketServer();
  await connectMqtt();

}

async function connectToRedis() {

  await connect();

}

async function bootstrapWebSocketServer() {

  await startWebSocketServer();

}
