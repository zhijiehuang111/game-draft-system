-- 玩家帳號
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 最終結果（phase=done 時寫入）
-- room_id 是 in-memory 房間的 UUID，作為同一局 5 筆 row 的分組鍵
CREATE TABLE draft_results (
  room_id           UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id),
  final_champion_id VARCHAR(32) NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_results_user ON draft_results(user_id);
