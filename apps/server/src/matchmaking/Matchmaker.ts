import { randomUUID } from "node:crypto";
import type { DraftEngine } from "../draft/engine.js";
import type { AppIoServer } from "../realtime/io.js";

const PARTY_SIZE = 4;

interface QueueEntry {
  userId: string;
  socketId: string;
  joinedAt: number;
}

export interface MatchmakerDeps {
  io: AppIoServer;
  draftEngine: DraftEngine;
}

export class Matchmaker {
  private readonly queue: QueueEntry[] = [];
  private readonly inQueue = new Map<string, true>();
  private readonly io: AppIoServer;
  private readonly draftEngine: DraftEngine;

  constructor(deps: MatchmakerDeps) {
    this.io = deps.io;
    this.draftEngine = deps.draftEngine;
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

      const roomId = randomUUID();
      try {
        await this.draftEngine.createRoom(
          roomId,
          party.map((p, i) => ({ userId: p.userId, slot: i })),
        );
      } catch (err) {
        console.error("[matchmaking] failed to start draft", err);
        this.queue.unshift(...party);
        break;
      }

      for (const entry of party) this.inQueue.delete(entry.userId);

      for (const entry of party) {
        this.io.to(`user:${entry.userId}`).emit("room:start", { roomId });
      }
      this.broadcastSize();
      this.emitPositions();
    }
  }

  private broadcastSize(): void {
    this.io.emit("queue:update", { size: this.queue.length });
  }

  private emitPositions(): void {
    this.queue.forEach((entry, index) => {
      this.io
        .to(`user:${entry.userId}`)
        .emit("queue:update", { size: this.queue.length, position: index + 1 });
    });
  }
}
