import type { Pool } from 'pg';
import { CHAMPIONS, type DraftResult } from '@app/shared';
import { pool as defaultPool } from '../db/pool.js';
import { findById } from '../db/repositories/users.repo.js';
import type { AppIoServer } from '../realtime/io.js';
import { DraftRoom } from './Room.js';
import { RoomRegistry } from './RoomRegistry.js';
import type { RoomState } from './types.js';

export interface DraftPlayer {
  userId: string;
  slot: number;
}

export interface DraftEngineDeps {
  io: AppIoServer;
  pool?: Pool;
}

export interface DraftEngine {
  createRoom(roomId: string, players: DraftPlayer[]): Promise<void>;
  handleRoomJoin(userId: string, roomId: string): { ok: true; snapshot: RoomState; results: DraftResult[] | null } | { ok: false; code: string };
  handlePickInitial(userId: string, championId: string): { ok: true } | { ok: false; code: string; message: string };
  handlePickBench(userId: string, championId: string): { ok: true } | { ok: false; code: string; message: string };
  markUserDisconnected(userId: string): void;
  hasActiveRoom(userId: string): boolean;
}

export function createDraftEngine(deps: DraftEngineDeps): DraftEngine {
  const pool = deps.pool ?? defaultPool;
  const registry = new RoomRegistry();
  const championPool = CHAMPIONS.map((c) => c.id);

  async function createRoom(roomId: string, players: DraftPlayer[]): Promise<void> {
    const enriched = await Promise.all(
      players.map(async (p) => {
        const user = await findById(pool, p.userId);
        return {
          userId: p.userId,
          slot: p.slot,
          username: user?.username ?? p.userId.slice(0, 8),
        };
      }),
    );
    const room = new DraftRoom(roomId, enriched, {
      io: deps.io,
      pool,
      championPool,
      onClosed: (id) => registry.remove(id),
    });
    registry.add(
      room,
      enriched.map((p) => p.userId),
    );
    room.start();
  }

  function handleRoomJoin(userId: string, roomId: string) {
    const room = registry.get(roomId);
    if (!room) return { ok: false as const, code: 'room-not-found' };
    if (!room.hasUser(userId)) return { ok: false as const, code: 'not-in-room' };
    if (room.isDisconnected(userId)) room.clearDisconnected(userId);
    return {
      ok: true as const,
      snapshot: room.snapshot(),
      results: room.getResults(),
    };
  }

  function markUserDisconnected(userId: string): void {
    const room = registry.getByUser(userId);
    if (!room) return;
    room.markDisconnected(userId);
  }

  function hasActiveRoom(userId: string): boolean {
    return registry.getByUser(userId) !== undefined;
  }

  function handlePickInitial(userId: string, championId: string) {
    const room = registry.getByUser(userId);
    if (!room) return { ok: false as const, code: 'not-in-room', message: 'no active room' };
    return room.handleInitialPick(userId, championId);
  }

  function handlePickBench(userId: string, championId: string) {
    const room = registry.getByUser(userId);
    if (!room) return { ok: false as const, code: 'not-in-room', message: 'no active room' };
    return room.handleBenchPick(userId, championId);
  }

  return {
    createRoom,
    handleRoomJoin,
    handlePickInitial,
    handlePickBench,
    markUserDisconnected,
    hasActiveRoom,
  };
}
