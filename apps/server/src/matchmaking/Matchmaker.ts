import type { Pool } from 'pg';
import { pool as defaultPool } from '../db/pool.js';
import {
  createRoom as createRoomRow,
  insertPlayers,
} from '../db/repositories/rooms.repo.js';
import type { DraftEngine } from '../draft/engine.js';
import type { AppIoServer } from '../realtime/io.js';

const PARTY_SIZE = 5;

interface QueueEntry {
  userId: string;
  socketId: string;
  joinedAt: number;
}

export interface MatchmakerDeps {
  io: AppIoServer;
  draftEngine: DraftEngine;
  pool?: Pool;
}

export class Matchmaker {
  private readonly queue: QueueEntry[] = [];
  private readonly inQueue = new Map<string, true>();
  private readonly io: AppIoServer;
  private readonly draftEngine: DraftEngine;
  private readonly pool: Pool;

  constructor(deps: MatchmakerDeps) {
    this.io = deps.io;
    this.draftEngine = deps.draftEngine;
    this.pool = deps.pool ?? defaultPool;
  }

  async join(userId: string, socketId: string): Promise<void> {
    if (this.inQueue.has(userId)) return;
    this.inQueue.set(userId, true);
    this.queue.push({ userId, socketId, joinedAt: Date.now() });
    this.broadcastSize();
    this.emitPositions();
    await this.tryMatch();
  }

  leave(userId: string): void {
    if (!this.inQueue.delete(userId)) return;
    const index = this.queue.findIndex((e) => e.userId === userId);
    if (index >= 0) this.queue.splice(index, 1);
    this.broadcastSize();
    this.emitPositions();
  }

  size(): number {
    return this.queue.length;
  }

  private async tryMatch(): Promise<void> {
    while (this.queue.length >= PARTY_SIZE) {
      const party = this.queue.splice(0, PARTY_SIZE);
      for (const entry of party) this.inQueue.delete(entry.userId);

      let roomId: string;
      try {
        roomId = await this.createRoomInDb(party.map((p) => p.userId));
      } catch (err) {
        console.error('[matchmaking] failed to create room', err);
        for (const entry of party) {
          this.inQueue.set(entry.userId, true);
          this.queue.unshift(entry);
        }
        break;
      }

      this.draftEngine.createRoom(
        roomId,
        party.map((p, i) => ({ userId: p.userId, slot: i })),
      );

      for (const entry of party) {
        this.io.to(`user:${entry.userId}`).emit('room:start', { roomId });
      }
      this.broadcastSize();
      this.emitPositions();
    }
  }

  private async createRoomInDb(userIds: string[]): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const room = await createRoomRow(client);
      await insertPlayers(client, room.id, userIds);
      await client.query('COMMIT');
      return room.id;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  private broadcastSize(): void {
    this.io.emit('queue:update', { size: this.queue.length });
  }

  private emitPositions(): void {
    this.queue.forEach((entry, index) => {
      this.io
        .to(`user:${entry.userId}`)
        .emit('queue:update', { size: this.queue.length, position: index + 1 });
    });
  }
}
