import type { DraftResult } from "@app/shared";
import type { Db } from "./types.js";

interface DraftResultRow {
  room_id: string;
  user_id: string;
  final_champion_id: string;
  completed_at: Date;
}

function mapResult(row: DraftResultRow): DraftResult {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    finalChampionId: row.final_champion_id,
    completedAt: row.completed_at,
  };
}

export interface DraftResultInput {
  userId: string;
  finalChampionId: string;
}

export async function insertResults(
  db: Db,
  roomId: string,
  entries: DraftResultInput[],
): Promise<DraftResult[]> {
  if (entries.length === 0) return [];
  const values: string[] = [];
  const params: unknown[] = [];
  entries.forEach((e, i) => {
    values.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
    params.push(roomId, e.userId, e.finalChampionId);
  });
  const { rows } = await db.query<DraftResultRow>(
    `INSERT INTO draft_results (room_id, user_id, final_champion_id)
     VALUES ${values.join(", ")}
     RETURNING room_id, user_id, final_champion_id, completed_at`,
    params,
  );
  return rows.map(mapResult);
}
