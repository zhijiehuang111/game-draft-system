import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeIo, type EmitRecord } from "../test-helpers/io.js";
import type { Rng } from "./allocate.js";
import { DraftRoom, type RoomDeps } from "./Room.js";
import type { RoomPlayerInit } from "./types.js";

const INITIAL_MS = 15_000;
const BENCH_MS = 45_000;
const LOCK_MS = 3_000;
const RETENTION_MS = 60_000;

const RNG: Rng = () => 0.2;

const PLAYERS: RoomPlayerInit[] = [
  { userId: "u0", username: "U0", slot: 0 },
  { userId: "u1", username: "U1", slot: 1 },
  { userId: "u2", username: "U2", slot: 2 },
  { userId: "u3", username: "U3", slot: 3 },
];

const CHAMPION_POOL = Array.from({ length: 20 }, (_, i) => `c${i}`);

function makeRoom(deps: Partial<RoomDeps> = {}) {
  const { io, emits } = createFakeIo();
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const pool = { query } as unknown as Pool;
  const onClosed = vi.fn();
  const room = new DraftRoom("room1", PLAYERS, {
    io,
    pool,
    championPool: CHAMPION_POOL,
    onClosed,
    rng: RNG,
    ...deps,
  });
  return { room, emits, query, onClosed };
}

function eventsOf(emits: EmitRecord[], event: string) {
  return emits.filter((e) => e.event === event);
}

describe("DraftRoom state machine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("phase transitions", () => {
    it("start() enters initial-pick and broadcasts phase / state", () => {
      const { room, emits } = makeRoom();
      room.start();

      expect(room.getPhase()).toBe("initial-pick");
      expect(eventsOf(emits, "room:phase")).toHaveLength(1);
      expect(eventsOf(emits, "room:state")).toHaveLength(1);
    });

    it("auto-advances to bench-trade after 15s, filling picks and bench", async () => {
      const { room } = makeRoom();
      room.start();

      await vi.advanceTimersByTimeAsync(INITIAL_MS);

      expect(room.getPhase()).toBe("bench-trade");
      const snap = room.snapshot();
      for (const p of snap.players) expect(p.currentChampion).not.toBeNull();
      expect(snap.bench).toHaveLength(4);
    });

    it("advances from bench-trade to lock-in after another 45s", async () => {
      const { room } = makeRoom();
      room.start();

      await vi.advanceTimersByTimeAsync(INITIAL_MS);
      await vi.advanceTimersByTimeAsync(BENCH_MS);

      expect(room.getPhase()).toBe("lock-in");
    });

    it("finalizes to done after another 3s, persisting to DB and broadcasting room:result", async () => {
      const { room, emits, query } = makeRoom();
      room.start();

      await vi.advanceTimersByTimeAsync(INITIAL_MS);
      await vi.advanceTimersByTimeAsync(BENCH_MS);
      await vi.advanceTimersByTimeAsync(LOCK_MS);

      expect(room.getPhase()).toBe("done");
      expect(query).toHaveBeenCalledTimes(1);
      const results = eventsOf(emits, "room:result");
      expect(results).toHaveLength(1);
      expect(room.getResults()).toHaveLength(4);
    });

    it("calls onClosed only after the retention period past done", async () => {
      const { room, onClosed } = makeRoom();
      room.start();

      await vi.advanceTimersByTimeAsync(INITIAL_MS + BENCH_MS + LOCK_MS);
      expect(room.getPhase()).toBe("done");
      expect(onClosed).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(RETENTION_MS);
      expect(onClosed).toHaveBeenCalledWith("room1");
    });
  });

  describe("manual pick during initial-pick", () => {
    it("picks an allocated champion and keeps it into bench-trade (not overwritten by autoFill)", async () => {
      const { room } = makeRoom();
      room.start();

      const champ = room.snapshot().players[0].allocated[0];
      const res = room.handleInitialPick("u0", champ);

      expect(res.ok).toBe(true);
      expect(room.snapshot().players[0].currentChampion).toBe(champ);

      await vi.advanceTimersByTimeAsync(INITIAL_MS);
      expect(room.snapshot().players[0].currentChampion).toBe(champ);
    });

    it("rejects a champion not in the allocation", () => {
      const { room } = makeRoom();
      room.start();

      const res = room.handleInitialPick("u0", "not-allocated");
      expect(res).toMatchObject({ ok: false, code: "not-allocated" });
    });

    it("rejects picking twice", () => {
      const { room } = makeRoom();
      room.start();

      const champ = room.snapshot().players[0].allocated[0];
      room.handleInitialPick("u0", champ);
      const second = room.handleInitialPick("u0", champ);

      expect(second).toMatchObject({ ok: false, code: "already-picked" });
    });
  });

  describe("bench swap during bench-trade", () => {
    it("swaps the held champion for a bench one, returning the old one to the bench", async () => {
      const { room } = makeRoom();
      room.start();
      await vi.advanceTimersByTimeAsync(INITIAL_MS);

      const before = room.snapshot();
      const previous = before.players[0].currentChampion;
      const benchChamp = before.bench[0];

      const res = room.handleBenchPick("u0", benchChamp);
      expect(res.ok).toBe(true);

      const after = room.snapshot();
      expect(after.players[0].currentChampion).toBe(benchChamp);
      expect(after.bench).toContain(previous);
      expect(after.bench).not.toContain(benchChamp);
    });

    it("rejects a champion not on the bench", async () => {
      const { room } = makeRoom();
      room.start();
      await vi.advanceTimersByTimeAsync(INITIAL_MS);

      const res = room.handleBenchPick("u0", "not-on-bench");
      expect(res).toMatchObject({ ok: false, code: "not-on-bench" });
    });
  });

  describe("phase gate: actions are blocked in the wrong phase", () => {
    it("cannot benchPick during initial-pick (wrong-phase)", () => {
      const { room } = makeRoom();
      room.start();

      const res = room.handleBenchPick("u0", "c0");
      expect(res).toMatchObject({ ok: false, code: "wrong-phase" });
    });

    it("cannot initialPick during bench-trade (wrong-phase)", async () => {
      const { room } = makeRoom();
      room.start();
      await vi.advanceTimersByTimeAsync(INITIAL_MS);

      const champ = room.snapshot().players[0].allocated[0];
      const res = room.handleInitialPick("u0", champ);
      expect(res).toMatchObject({ ok: false, code: "wrong-phase" });
    });

    it("locks all picks during lock-in (phase-locked)", async () => {
      const { room } = makeRoom();
      room.start();
      await vi.advanceTimersByTimeAsync(INITIAL_MS);
      await vi.advanceTimersByTimeAsync(BENCH_MS);

      expect(room.getPhase()).toBe("lock-in");
      expect(room.handleInitialPick("u0", "c0")).toMatchObject({
        ok: false,
        code: "phase-locked",
      });
      expect(room.handleBenchPick("u0", "c0")).toMatchObject({
        ok: false,
        code: "phase-locked",
      });
    });
  });
});
