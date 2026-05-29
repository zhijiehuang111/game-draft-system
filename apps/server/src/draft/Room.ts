import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { insertResults } from "../db/repositories/results.repo.js";
import type { AppIoServer } from "../realtime/io.js";
import {
  TRADE_TTL_MS,
  type TradeRequest,
  type TradeResolvedReason,
} from "../trade/types.js";
import { allocateChampions, type Rng } from "./allocate.js";
import type { DraftResult } from "@app/shared";
import {
  PHASE_DURATION_MS,
  type Phase,
  type PlayerState,
  type RoomPlayerInit,
  type RoomState,
} from "./types.js";

const RESULT_RETENTION_MS = 60_000;
const DISCONNECT_GRACE_MS = 15_000;

export interface RoomDeps {
  io: AppIoServer;
  pool: Pool;
  championPool: readonly string[];
  onClosed?: (roomId: string) => void;
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
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingTrades = new Map<string, TradeRequest>();
  private readonly tradeTimers = new Map<string, NodeJS.Timeout>();
  /** userId -> tradeId; either side of a pending trade is locked. */
  private readonly lockedUsers = new Map<string, string>();
  private lastResults: DraftResult[] | null = null;
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
      pendingTrades: [...this.pendingTrades.values()].map((t) => ({ ...t })),
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
    if (this.hasPendingTrade(userId)) {
      return {
        ok: false,
        code: "has-pending-trade",
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
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    this.disconnectTimers.clear();
    for (const t of this.tradeTimers.values()) clearTimeout(t);
    this.tradeTimers.clear();
    this.pendingTrades.clear();
    this.lockedUsers.clear();
  }

  hasPendingTrade(userId: string): boolean {
    return this.lockedUsers.has(userId);
  }

  handleTradeRequest(
    fromUserId: string,
    targetUserId: string,
    offerChampionId: string,
    wantChampionId: string,
  ):
    | { ok: true; trade: TradeRequest }
    | { ok: false; code: string; message: string } {
    if (this.phase !== "bench-trade") {
      return {
        ok: false,
        code: "wrong-phase",
        message: "not bench-trade phase",
      };
    }
    if (fromUserId === targetUserId) {
      return {
        ok: false,
        code: "self-trade",
        message: "cannot trade with self",
      };
    }
    const from = this.players.find((p) => p.userId === fromUserId);
    if (!from)
      return { ok: false, code: "not-in-room", message: "user not in room" };
    const target = this.players.find((p) => p.userId === targetUserId);
    if (!target) {
      return {
        ok: false,
        code: "target-not-in-room",
        message: "target not in room",
      };
    }
    if (from.currentChampion !== offerChampionId) {
      return {
        ok: false,
        code: "offer-not-held",
        message: "offer champion not held",
      };
    }
    if (target.currentChampion !== wantChampionId) {
      return {
        ok: false,
        code: "want-not-held",
        message: "want champion not held by target",
      };
    }
    if (this.hasPendingTrade(fromUserId)) {
      return {
        ok: false,
        code: "has-pending-trade",
        message: "you already have a pending trade",
      };
    }
    if (this.hasPendingTrade(targetUserId)) {
      return {
        ok: false,
        code: "target-busy",
        message: "target has a pending trade",
      };
    }

    const now = Date.now();
    const trade: TradeRequest = {
      tradeId: randomUUID(),
      fromUserId,
      toUserId: targetUserId,
      offerChampionId,
      wantChampionId,
      createdAt: now,
      expiresAt: now + TRADE_TTL_MS,
    };
    this.pendingTrades.set(trade.tradeId, trade);
    this.lockedUsers.set(fromUserId, trade.tradeId);
    this.lockedUsers.set(targetUserId, trade.tradeId);

    const timer = setTimeout(() => {
      this.tradeTimers.delete(trade.tradeId);
      this.resolveTrade(trade.tradeId, { accepted: false, reason: "timeout" });
    }, TRADE_TTL_MS);
    this.tradeTimers.set(trade.tradeId, timer);

    this.deps.io
      .to(`user:${targetUserId}`)
      .emit("trade:incoming", { ...trade });
    this.deps.io.to(`user:${fromUserId}`).emit("trade:pending", { ...trade });
    this.broadcastState();
    return { ok: true, trade };
  }

  handleTradeRespond(
    userId: string,
    tradeId: string,
    accept: boolean,
  ): { ok: true } | { ok: false; code: string; message: string } {
    const trade = this.pendingTrades.get(tradeId);
    if (!trade) {
      return {
        ok: false,
        code: "no-pending-trade",
        message: "trade not found",
      };
    }
    if (trade.toUserId !== userId) {
      return {
        ok: false,
        code: "not-trade-target",
        message: "only the target can respond",
      };
    }
    if (!accept) {
      this.resolveTrade(tradeId, { accepted: false });
      return { ok: true };
    }

    const from = this.players.find((p) => p.userId === trade.fromUserId);
    const to = this.players.find((p) => p.userId === trade.toUserId);
    if (
      !from ||
      !to ||
      from.currentChampion !== trade.offerChampionId ||
      to.currentChampion !== trade.wantChampionId
    ) {
      this.resolveTrade(tradeId, { accepted: false });
      return { ok: true };
    }

    from.currentChampion = trade.wantChampionId;
    to.currentChampion = trade.offerChampionId;
    this.resolveTrade(tradeId, { accepted: true });
    return { ok: true };
  }

  handleTradeCancel(
    userId: string,
    tradeId: string,
  ): { ok: true } | { ok: false; code: string; message: string } {
    if (this.phase !== "bench-trade") {
      return {
        ok: false,
        code: "wrong-phase",
        message: "not bench-trade phase",
      };
    }
    const trade = this.pendingTrades.get(tradeId);
    if (!trade) {
      return {
        ok: false,
        code: "no-pending-trade",
        message: "trade not found",
      };
    }
    if (trade.fromUserId !== userId) {
      return {
        ok: false,
        code: "not-trade-owner",
        message: "only the requester can cancel",
      };
    }
    this.resolveTrade(tradeId, { accepted: false, reason: "cancelled" });
    return { ok: true };
  }

  private resolveTrade(
    tradeId: string,
    outcome: { accepted: boolean; reason?: TradeResolvedReason },
  ): void {
    const trade = this.pendingTrades.get(tradeId);
    if (!trade) return;
    this.pendingTrades.delete(tradeId);
    this.lockedUsers.delete(trade.fromUserId);
    this.lockedUsers.delete(trade.toUserId);
    const timer = this.tradeTimers.get(tradeId);
    if (timer) {
      clearTimeout(timer);
      this.tradeTimers.delete(tradeId);
    }
    const payload = {
      tradeId,
      fromUserId: trade.fromUserId,
      toUserId: trade.toUserId,
      ...outcome,
    };
    this.deps.io.to(`user:${trade.fromUserId}`).emit("trade:resolved", payload);
    this.deps.io.to(`user:${trade.toUserId}`).emit("trade:resolved", payload);
    this.broadcastState();
  }

  private clearAllPendingTrades(): void {
    for (const timer of this.tradeTimers.values()) clearTimeout(timer);
    this.tradeTimers.clear();
    this.pendingTrades.clear();
    this.lockedUsers.clear();
  }

  isDisconnected(userId: string): boolean {
    return userId in this.disconnected;
  }

  getResults(): DraftResult[] | null {
    return this.lastResults;
  }

  markDisconnected(userId: string): void {
    if (!this.userIds.has(userId)) return;
    if (this.phase === "done" || this.phase === "aborted") return;
    if (this.isDisconnected(userId)) return;

    this.disconnected[userId] = Date.now();
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(userId);
      this.checkStillGone(userId);
    }, DISCONNECT_GRACE_MS);
    this.disconnectTimers.set(userId, timer);
    this.deps.io.to(this.channel()).emit("player:disconnected", { userId });
  }

  clearDisconnected(userId: string): void {
    if (!this.isDisconnected(userId)) return;
    delete this.disconnected[userId];
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }
    this.deps.io.to(this.channel()).emit("player:reconnected", { userId });
  }

  abort(reason: string): void {
    if (this.phase === "done" || this.phase === "aborted") return;
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    this.disconnectTimers.clear();

    this.transitionTo("aborted");
    this.deps.io.to(this.channel()).emit("room:aborted", { reason });
    this.deps.onClosed?.(this.roomId);
  }

  private checkStillGone(userId: string): void {
    if (this.phase === "done" || this.phase === "aborted") return;
    if (!this.isDisconnected(userId)) return;
    this.abort("player-left");
  }

  private transitionTo(phase: Phase): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.phase = phase;
    if (phase !== "bench-trade") this.clearAllPendingTrades();

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
    this.lastResults = results;
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
