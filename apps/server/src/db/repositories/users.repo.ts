import type { User } from '@app/shared';
import type { Db } from './types.js';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

export async function createUser(
  db: Db,
  username: string,
  passwordHash: string,
): Promise<User> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, password_hash, created_at`,
    [username, passwordHash],
  );
  return mapUser(rows[0]);
}

export async function findByUsername(db: Db, username: string): Promise<User | null> {
  const { rows } = await db.query<UserRow>(
    `SELECT id, username, password_hash, created_at
     FROM users WHERE username = $1`,
    [username],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findById(db: Db, id: string): Promise<User | null> {
  const { rows } = await db.query<UserRow>(
    `SELECT id, username, password_hash, created_at
     FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}
