import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@app/shared';
import { socketAuth } from '../auth/socket-middleware.js';
import { RealtimeRegistry } from './RealtimeRegistry.js';

export type AppIoServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export interface Realtime {
  io: AppIoServer;
  registry: RealtimeRegistry;
}

export function createRealtime(httpServer: HttpServer): Realtime {
  const io: AppIoServer = new Server(httpServer);
  const registry = new RealtimeRegistry(io);

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    registry.bind(userId, socket.id);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      registry.unbind(socket.id);
    });
  });

  return { io, registry };
}
