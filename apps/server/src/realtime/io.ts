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
import { replyError } from './reply-error.js';

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
  const draftEngine = createDraftEngine({ io });
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

    socket.on('room:join', ({ roomId }) => {
      const result = draftEngine.handleRoomJoin(userId, roomId);
      if (!result.ok) {
        replyError(socket, result.code, 'cannot join room');
        return;
      }
      socket.join(`room:${roomId}`);
      registry.setRoom(userId, roomId);
      socket.emit('room:state', result.snapshot);
    });

    socket.on('pick:initial', ({ championId }) => {
      const result = draftEngine.handlePickInitial(userId, championId);
      if (!result.ok) replyError(socket, result.code, result.message);
    });

    socket.on('pick:bench', ({ championId }) => {
      const result = draftEngine.handlePickBench(userId, championId);
      if (!result.ok) replyError(socket, result.code, result.message);
    });

    socket.on('disconnect', () => {
      matchmaker.leave(userId);
      registry.unbind(socket.id);
    });
  });

  return { io, registry, matchmaker };
}
