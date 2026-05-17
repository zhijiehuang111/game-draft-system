-- 玩家帳號
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 房間（matchmaking 為主，預留 custom 欄位）
CREATE TABLE rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(16) NOT NULL DEFAULT 'matchmaking',
  invite_code  VARCHAR(16),
  status       VARCHAR(16) NOT NULL,
  abort_reason VARCHAR(32),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ
);
CREATE INDEX idx_rooms_status ON rooms(status);

-- 房間玩家（每房 5 人）
CREATE TABLE room_players (
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id),
  slot      SMALLINT NOT NULL CHECK (slot BETWEEN 0 AND 4),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id),
  UNIQUE (room_id, slot)
);

-- 最終結果（phase=done 時寫入）
CREATE TABLE draft_results (
  room_id           UUID NOT NULL REFERENCES rooms(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  final_champion_id VARCHAR(32) NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_results_user ON draft_results(user_id);
