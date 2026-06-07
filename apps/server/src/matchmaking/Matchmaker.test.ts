import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftEngine, DraftPlayer } from "../draft/engine.js";
import type { AppIoServer } from "../realtime/io.js";
import { Matchmaker } from "./Matchmaker.js";

interface EmitRecord {
  target: string | null;
  event: string;
  payload: unknown;
}

function createFakeIo() {
  const emits: EmitRecord[] = [];
  const io = {
    emit: (event: string, payload: unknown) =>
      emits.push({ target: null, event, payload }),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emits.push({ target: room, event, payload }),
    }),
  };
  return { io: io as unknown as AppIoServer, emits };
}

describe("Matchmaker", () => {
  let emits: EmitRecord[];
  let io: AppIoServer;
  let createRoom: ReturnType<typeof vi.fn>;
  let draftEngine: DraftEngine;
  let matchmaker: Matchmaker;

  beforeEach(() => {
    ({ io, emits } = createFakeIo());
    createRoom = vi.fn().mockResolvedValue(undefined);
    draftEngine = { createRoom } as unknown as DraftEngine;
    matchmaker = new Matchmaker({ io, draftEngine });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts empty", () => {
    expect(matchmaker.size()).toBe(0);
  });

  it("adds a player to the queue on join", async () => {
    await matchmaker.join("u0", "s0");
    expect(matchmaker.size()).toBe(1);
  });

  it("ignores a duplicate join from the same user", async () => {
    await matchmaker.join("u0", "s0");
    await matchmaker.join("u0", "s0-reconnect");
    expect(matchmaker.size()).toBe(1);
  });

  it("removes a player on leave", async () => {
    await matchmaker.join("u0", "s0");
    matchmaker.leave("u0");
    expect(matchmaker.size()).toBe(0);
  });

  it("is a no-op when leaving without being queued", () => {
    expect(() => matchmaker.leave("ghost")).not.toThrow();
    expect(matchmaker.size()).toBe(0);
  });

  it("forms a room once 4 players have joined", async () => {
    for (let i = 0; i < 4; i++) await matchmaker.join(`u${i}`, `s${i}`);

    expect(createRoom).toHaveBeenCalledTimes(1);
    const [, players] = createRoom.mock.calls[0] as [string, DraftPlayer[]];
    expect(players).toEqual([
      { userId: "u0", slot: 0 },
      { userId: "u1", slot: 1 },
      { userId: "u2", slot: 2 },
      { userId: "u3", slot: 3 },
    ]);
    expect(matchmaker.size()).toBe(0);
  });

  it("emits room:start to each matched player", async () => {
    for (let i = 0; i < 4; i++) await matchmaker.join(`u${i}`, `s${i}`);

    const starts = emits.filter((e) => e.event === "room:start");
    expect(starts).toHaveLength(4);
    expect(starts.map((e) => e.target).sort()).toEqual([
      "user:u0",
      "user:u1",
      "user:u2",
      "user:u3",
    ]);
    const roomIds = new Set(
      starts.map((e) => (e.payload as { roomId: string }).roomId),
    );
    expect(roomIds.size).toBe(1);
  });

  it("tells each queued player their position", async () => {
    // 取某個 user 最後一次收到的 queue:update payload
    const lastPos = (user: string) =>
      emits
        .filter(
          (e) => e.target === `user:${user}` && e.event === "queue:update",
        )
        .at(-1)?.payload;

    for (let i = 0; i < 3; i++) await matchmaker.join(`u${i}`, `s${i}`);

    expect(lastPos("u0")).toEqual({ size: 3, position: 1 });
    expect(lastPos("u1")).toEqual({ size: 3, position: 2 });
    expect(lastPos("u2")).toEqual({ size: 3, position: 3 });
  });

  it("recomputes positions after a leave and a later join", async () => {
    const lastPos = (user: string) =>
      emits
        .filter(
          (e) => e.target === `user:${user}` && e.event === "queue:update",
        )
        .at(-1)?.payload;

    for (let i = 0; i < 3; i++) await matchmaker.join(`u${i}`, `s${i}`);

    matchmaker.leave("u1");
    expect(lastPos("u2")).toEqual({ size: 2, position: 2 });

    await matchmaker.join("u3", "s3");
    expect(lastPos("u0")).toEqual({ size: 3, position: 1 });
    expect(lastPos("u2")).toEqual({ size: 3, position: 2 });
    expect(lastPos("u3")).toEqual({ size: 3, position: 3 });
  });

  it("does not form a room with fewer than 4 players", async () => {
    for (let i = 0; i < 3; i++) await matchmaker.join(`u${i}`, `s${i}`);
    expect(createRoom).not.toHaveBeenCalled();
    expect(matchmaker.size()).toBe(3);
  });

  it("returns the party to the queue when createRoom fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createRoom.mockRejectedValueOnce(new Error("db down"));

    for (let i = 0; i < 4; i++) await matchmaker.join(`u${i}`, `s${i}`);

    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(matchmaker.size()).toBe(4);
    expect(emits.some((e) => e.event === "room:start")).toBe(false);
  });

  it("preserves queue order when a failed party is restored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createRoom.mockRejectedValue(new Error("db down"));

    for (let i = 0; i < 5; i++) await matchmaker.join(`u${i}`, `s${i}`);
    expect(matchmaker.size()).toBe(5);
    expect(createRoom).toHaveBeenCalledTimes(2);

    createRoom.mockResolvedValue(undefined);
    await matchmaker.join("u5", "s5");

    expect(createRoom).toHaveBeenCalledTimes(3);
    const [, players] = createRoom.mock.calls[2] as [string, DraftPlayer[]];
    expect(players.map((p) => p.userId)).toEqual(["u0", "u1", "u2", "u3"]);
    expect(matchmaker.size()).toBe(2);
  });
});
