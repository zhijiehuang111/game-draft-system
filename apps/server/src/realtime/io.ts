import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@app/shared';
import { socketAuth } from '../auth/socket-middleware.js';
import { createDraftEngine } from '../draft/engine.js';
import { Matchmaker } from '../matchmaking/Matchmaker.js';
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
  matchmaker: Matchmaker;
}

export function createRealtime(httpServer: HttpServer): Realtime {
  const io: AppIoServer = new Server(httpServer);
  const registry = new RealtimeRegistry(io);
  const draftEngine = createDraftEngine();
  const matchmaker = new Matchmaker({ io, draftEngine });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    registry.bind(userId, socket.id);
    socket.join(`user:${userId}`);
    socket.emit('queue:update', { size: matchmaker.size() });

    socket.on('queue:join', () => {
      matchmaker.join(userId, socket.id).catch((err) => {
        console.error('[queue:join] error', err);
      });
    });

    socket.on('queue:leave', () => {
      matchmaker.leave(userId);
    });

    socket.on('disconnect', () => {
      matchmaker.leave(userId);
      registry.unbind(socket.id);
    });
  });

  return { io, registry, matchmaker };
}
