import { CHAMPIONS } from "@app/shared";
import { allocateChampions, type Rng } from "./allocate.js";

function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function run(): void {
  const pool = CHAMPIONS.map((c) => c.id);
  const players = Array.from({ length: 4 }, (_, i) => ({
    userId: `u${i}`,
    slot: i,
  }));

  for (let seed = 1; seed <= 20; seed += 1) {
    const result = allocateChampions(players, pool, seeded(seed));
    assert(result.length === 4, `seed ${seed}: result length`);
    const all: string[] = [];
    for (const r of result) {
      assert(
        r.allocated.length === 2 || r.allocated.length === 3,
        `seed ${seed}: ${r.userId} got ${r.allocated.length}`,
      );
      all.push(...r.allocated);
    }
    const unique = new Set(all);
    assert(
      unique.size === all.length,
      `seed ${seed}: duplicate champion in allocation`,
    );
    for (const id of all)
      assert(pool.includes(id), `seed ${seed}: ${id} not in pool`);
  }

  // determinism: same seed => same result
  const a = allocateChampions(players, pool, seeded(42));
  const b = allocateChampions(players, pool, seeded(42));
  assert(JSON.stringify(a) === JSON.stringify(b), "seed 42 not deterministic");

  console.log("allocate.smoke: OK");
}

run();
