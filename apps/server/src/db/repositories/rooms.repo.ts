import type { Room, RoomPlayer } from '@app/shared';
import type { Db } from './types.js';

interface RoomRow {
  id: string;
  type: string;
  invite_code: string | null;
  status: 'drafting' | 'completed' | 'aborted';
  abort_reason: string | null;
  created_at: Date;
  finished_at: Date | null;
}

interface RoomPlayerRow {
  room_id: string;
  user_id: string;
  slot: number;
  joined_at: Date;
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    type: row.type,
    inviteCode: row.invite_code,
    status: row.status,
    abortReason: row.abort_reason,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function mapRoomPlayer(row: RoomPlayerRow): RoomPlayer {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    slot: row.slot,
    joinedAt: row.joined_at,
  };
}

export async function createRoom(db: Db): Promise<Room> {
  const { rows } = await db.query<RoomRow>(
    `INSERT INTO rooms (status)
     VALUES ('drafting')
     RETURNING id, type, invite_code, status, abort_reason, created_at, finished_at`,
  );
  return mapRoom(rows[0]);
}

export async function insertPlayers(
  db: Db,
  roomId: string,
  userIds: string[],
): Promise<RoomPlayer[]> {
  if (userIds.length === 0) return [];
  const values: string[] = [];
  const params: unknown[] = [];
  userIds.forEach((userId, i) => {
    values.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
    params.push(roomId, userId, i);
  });
  const { rows } = await db.query<RoomPlayerRow>(
    `INSERT INTO room_players (room_id, user_id, slot)
     VALUES ${values.join(', ')}
     RETURNING room_id, user_id, slot, joined_at`,
    params,
  );
  return rows.map(mapRoomPlayer);
}

export async function completeRoom(db: Db, roomId: string): Promise<void> {
  await db.query(
    `UPDATE rooms SET status = 'completed', finished_at = NOW()
     WHERE id = $1`,
    [roomId],
  );
}

export async function abortRoom(db: Db, roomId: string, reason: string): Promise<void> {
  await db.query(
    `UPDATE rooms SET status = 'aborted', abort_reason = $2, finished_at = NOW()
     WHERE id = $1`,
    [roomId, reason],
  );
}
