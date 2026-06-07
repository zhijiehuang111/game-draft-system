import { describe, expect, it } from "vitest";
import { CHAMPIONS } from "@app/shared";
import {
  allocateChampions,
  type AllocationInput,
  type Rng,
} from "./allocate.js";

const pool = CHAMPIONS.map((c) => c.id);

function players(n: number): AllocationInput[] {
  return Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, slot: i }));
}

const low: Rng = () => 0.2; // < 0.5 → 每人 2 張
const high: Rng = () => 0.8; // >= 0.5 → 每人 3 張

// 按順序吐出指定的值,用完後固定回 0
function sequence(values: number[]): Rng {
  let i = 0;
  return () => values[i++] ?? 0;
}

describe("allocateChampions", () => {
  it("returns one result per player, preserving userId and slot", () => {
    const input = players(4);
    const result = allocateChampions(input, pool, low);

    expect(result).toHaveLength(4);
    result.forEach((r, i) => {
      expect(r.userId).toBe(input[i].userId);
      expect(r.slot).toBe(input[i].slot);
    });
  });

  it("gives each player 2 champions when rng < 0.5", () => {
    const result = allocateChampions(players(4), pool, low);
    for (const r of result) expect(r.allocated).toHaveLength(2);
  });

  it("gives each player 3 champions when rng >= 0.5", () => {
    const result = allocateChampions(players(4), pool, high);
    for (const r of result) expect(r.allocated).toHaveLength(3);
  });

  it("never allocates the same champion twice", () => {
    const all = allocateChampions(players(4), pool, high).flatMap(
      (r) => r.allocated,
    );
    expect(new Set(all).size).toBe(all.length);
  });

  it("only allocates champions from the pool", () => {
    const poolSet = new Set(pool);
    const all = allocateChampions(players(4), pool, high).flatMap(
      (r) => r.allocated,
    );
    for (const id of all) expect(poolSet.has(id)).toBe(true);
  });

  it("handles mixed counts without overlapping allocations", () => {
    const rng = sequence([0.2, 0.8, 0.2, 0.8]);
    const result = allocateChampions(players(4), pool, rng);

    expect(result.map((r) => r.allocated.length)).toEqual([2, 3, 2, 3]);
    // cursor 推進若有誤,相鄰兩人的牌會重疊 → 用「合起來不重複」抓出來。
    const all = result.flatMap((r) => r.allocated);
    expect(new Set(all).size).toBe(all.length);
  });

  it("throws when the pool is too small for the worst case", () => {
    const tinyPool = pool.slice(0, 5);
    expect(() => allocateChampions(players(2), tinyPool, high)).toThrow(
      /champion pool too small/,
    );
  });

  it("does not throw when the pool fits exactly", () => {
    const exactPool = pool.slice(0, 4);
    const result = allocateChampions(players(2), exactPool, low);
    expect(result.flatMap((r) => r.allocated)).toHaveLength(4);
  });

  it("handles an empty player list", () => {
    expect(allocateChampions([], pool, low)).toEqual([]);
  });
});
