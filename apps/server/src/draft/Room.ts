import type { Pool } from "pg";
import { insertResults } from "../db/repositories/results.repo.js";
import type { AppIoServer } from "../realtime/io.js";
import { allocateChampions, type Rng } from "./allocate.js";
import {
  PHASE_DURATION_MS,
  type Phase,
  type PlayerState,
  type RoomPlayerInit,
  type RoomState,
} from "./types.js";

const RESULT_RETENTION_MS = 60_000;

export interface RoomDeps {
  io: AppIoServer;
  pool: Pool;
  championPool: readonly string[];
  onClosed?: (roomId: string) => void;
  /** Hook for the Trade module; returns true if user is in a pending trade. */
  hasPendingTrade?: (roomId: string, userId: string) => boolean;
  rng?: Rng;
}

export class DraftRoom {
  readonly roomId: string;
  private phase: Phase = "initial-pick";
  private phaseEndsAt = 0;
  private phaseTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly players: PlayerState[];
  private readonly userIds: Set<string>;
  private bench: string[] = [];
  private readonly disconnected: Record<string, number> = {};
  private readonly deps: RoomDeps;

  constructor(roomId: string, players: RoomPlayerInit[], deps: RoomDeps) {
    this.roomId = roomId;
    this.deps = deps;

    const allocations = allocateChampions(
      players.map((p) => ({ userId: p.userId, slot: p.slot })),
      deps.championPool,
      deps.rng,
    );
    const byUser = new Map(allocations.map((a) => [a.userId, a]));
    this.players = players.map((p) => ({
      userId: p.userId,
      username: p.username,
      slot: p.slot,
      allocated: byUser.get(p.userId)?.allocated ?? [],
      currentChampion: null,
    }));
    this.userIds = new Set(players.map((p) => p.userId));
  }

  hasUser(userId: string): boolean {
    return this.userIds.has(userId);
  }

  getPhase(): Phase {
    return this.phase;
  }

  start(): void {
    this.transitionTo("initial-pick");
    this.broadcastState();
  }

  snapshot(): RoomState {
    return {
      roomId: this.roomId,
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      players: this.players.map((p) => ({ ...p, allocated: [...p.allocated] })),
      bench: [...this.bench],
      pendingTrade: null,
      disconnected: { ...this.disconnected },
    };
  }

  handleInitialPick(
    userId: string,
    championId: string,
  ): { ok: true } | { ok: false; code: string; message: string } {
    if (
      this.phase === "lock-in" ||
      this.phase === "done" ||
      this.phase === "aborted"
    ) {
      return {
        ok: false,
        code: "phase-locked",
        message: "cannot pick in this phase",
      };
    }
    if (this.phase !== "initial-pick") {
      return {
        ok: false,
        code: "wrong-phase",
        message: "not initial-pick phase",
      };
    }
    const player = this.players.find((p) => p.userId === userId);
    if (!player)
      return { ok: false, code: "not-in-room", message: "user not in room" };
    if (player.currentChampion !== null) {
      return { ok: false, code: "already-picked", message: "already picked" };
    }
    if (!player.allocated.includes(championId)) {
      return {
        ok: false,
        code: "not-allocated",
        message: "champion not in allocation",
      };
    }
    player.currentChampion = championId;
    this.broadcastState();
    return { ok: true };
  }

  handleBenchPick(
    userId: string,
    championId: string,
  ): { ok: true } | { ok: false; code: string; message: string } {
    if (
      this.phase === "lock-in" ||
      this.phase === "done" ||
      this.phase === "aborted"
    ) {
      return {
        ok: false,
        code: "phase-locked",
        message: "cannot pick in this phase",
      };
    }
    if (this.phase !== "bench-trade") {
      return {
        ok: false,
        code: "wrong-phase",
        message: "not bench-trade phase",
      };
    }
    const player = this.players.find((p) => p.userId === userId);
    if (!player)
      return { ok: false, code: "not-in-room", message: "user not in room" };
    if (player.currentChampion === null) {
      return {
        ok: false,
        code: "no-current-champion",
        message: "no champion to swap",
      };
    }
    if (this.deps.hasPendingTrade?.(this.roomId, userId)) {
      return {
        ok: false,
        code: "pending-trade",
        message: "cannot pick during pending trade",
      };
    }
    const idx = this.bench.indexOf(championId);
    if (idx < 0)
      return {
        ok: false,
        code: "not-on-bench",
        message: "champion not on bench",
      };

    const previous = player.currentChampion;
    this.bench.splice(idx, 1);
    this.bench.push(previous);
    player.currentChampion = championId;

    this.broadcastState();
    return { ok: true };
  }

  destroy(): void {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.phaseTimer = null;
    this.cleanupTimer = null;
  }

  private transitionTo(phase: Phase): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.phase = phase;

    if (phase === "done" || phase === "aborted") {
      this.phaseEndsAt = Date.now();
      this.broadcastPhase();
      return;
    }

    const duration = PHASE_DURATION_MS[phase];
    this.phaseEndsAt = Date.now() + duration;
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      this.onPhaseEnd().catch((err) => {
        console.error(`[draft] phase end error for room ${this.roomId}`, err);
      });
    }, duration);
    this.broadcastPhase();
  }

  private async onPhaseEnd(): Promise<void> {
    if (this.phase === "initial-pick") {
      this.autoFillInitialPicks();
      this.initBench();
      this.transitionTo("bench-trade");
      this.broadcastState();
      return;
    }
    if (this.phase === "bench-trade") {
      this.transitionTo("lock-in");
      this.broadcastState();
      return;
    }
    if (this.phase === "lock-in") {
      await this.finalize();
    }
  }

  private autoFillInitialPicks(): void {
    const rng = this.deps.rng ?? Math.random;
    for (const player of this.players) {
      if (player.currentChampion !== null) continue;
      if (player.allocated.length === 0) continue;
      const idx = Math.floor(rng() * player.allocated.length);
      player.currentChampion = player.allocated[idx];
    }
  }

  private initBench(): void {
    const allocated = new Set<string>();
    const current = new Set<string>();
    for (const p of this.players) {
      for (const id of p.allocated) allocated.add(id);
      if (p.currentChampion) current.add(p.currentChampion);
    }
    this.bench = [...allocated].filter((id) => !current.has(id));
  }

  private async finalize(): Promise<void> {
    const entries = this.players
      .filter((p) => p.currentChampion !== null)
      .map((p) => ({
        userId: p.userId,
        finalChampionId: p.currentChampion as string,
      }));

    try {
      await insertResults(this.deps.pool, this.roomId, entries);
    } catch (err) {
      console.error(`[draft] failed to persist room ${this.roomId}`, err);
      throw err;
    }

    const results = entries.map((e) => ({
      roomId: this.roomId,
      userId: e.userId,
      finalChampionId: e.finalChampionId,
      completedAt: new Date(),
    }));
    this.deps.io.to(this.channel()).emit("room:result", results);

    this.transitionTo("done");

    this.cleanupTimer = setTimeout(() => {
      this.deps.onClosed?.(this.roomId);
    }, RESULT_RETENTION_MS);
  }

  private channel(): string {
    return `room:${this.roomId}`;
  }

  broadcastState(): void {
    this.deps.io.to(this.channel()).emit("room:state", this.snapshot());
  }

  private broadcastPhase(): void {
    this.deps.io.to(this.channel()).emit("room:phase", {
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
    });
  }
}
