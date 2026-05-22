export type Rng = () => number;

const defaultRng: Rng = Math.random;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface AllocationInput {
  userId: string;
  slot: number;
}

export interface AllocationResult {
  userId: string;
  slot: number;
  allocated: string[];
}

export function allocateChampions(
  players: readonly AllocationInput[],
  championPool: readonly string[],
  rng: Rng = defaultRng,
): AllocationResult[] {
  const counts = players.map(() => (rng() < 0.5 ? 2 : 3));
  const totalNeeded = counts.reduce((sum, n) => sum + n, 0);
  if (totalNeeded > championPool.length) {
    throw new Error(
      `champion pool too small: need ${totalNeeded}, have ${championPool.length}`,
    );
  }

  const shuffled = shuffle(championPool, rng);
  const results: AllocationResult[] = [];
  let cursor = 0;
  players.forEach((p, i) => {
    const n = counts[i];
    results.push({
      userId: p.userId,
      slot: p.slot,
      allocated: shuffled.slice(cursor, cursor + n),
    });
    cursor += n;
  });
  return results;
}
