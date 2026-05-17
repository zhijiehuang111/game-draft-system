# 模組 1：Data Layer

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §1
>
> 依賴：模組 0
>
> 提供 PostgreSQL schema、migration 工具、shared 型別對齊；劃定 DB 與記憶體邊界。

## 子任務

### Postgres 環境
- [ ] 建立 `docker-compose.yml`，提供本地 Postgres 服務（含 volume、port 5432）
- [ ] 在 README 加上「docker compose up -d postgres」啟動指引
- [ ] 後端建立 `pg` Pool（`apps/server/src/db/pool.ts`），從 `DATABASE_URL` 載入

### Migration 機制
- [ ] 選定 migration 工具（推薦：`node-pg-migrate` 或手寫 SQL runner），加入 `package.json` scripts
- [ ] 建立 `apps/server/migrations/` 目錄
- [ ] 撰寫 migration `001_init.sql`，包含 `users`、`rooms`、`room_players`、`draft_results` 4 張表
- [ ] DDL 完全對齊 detailed-design §1.3（含索引、UNIQUE、CHECK、預留 `type`/`invite_code` 欄位）
- [ ] 確認 `gen_random_uuid()` 可用（必要時 `CREATE EXTENSION IF NOT EXISTS pgcrypto`）
- [ ] 跑 `pnpm migrate:up` 成功，`psql` 檢查 schema 正確

### 共用型別
- [ ] `packages/shared/src/types/db.ts`：與 DB 欄位對齊的 `User`、`Room`、`RoomPlayer`、`DraftResult` 型別
- [ ] `packages/shared/src/types/room.ts`：runtime 用的 `Phase`、`RoomState`、`PlayerState`、`TradeRequest`
- [ ] `packages/shared/src/index.ts` 統一 re-export
- [ ] 兩邊 import 驗證：`apps/server` 與 `apps/client` 均可 import shared 型別

### Repository 層
- [ ] `apps/server/src/db/repositories/users.repo.ts`：`createUser`、`findByUsername`、`findById`
- [ ] `apps/server/src/db/repositories/rooms.repo.ts`：`createRoom`、`completeRoom`、`abortRoom`、`insertPlayers`
- [ ] `apps/server/src/db/repositories/results.repo.ts`：`insertResults`（批次寫 5 筆）
- [ ] 所有 repository 接受 `PoolClient` 參數，方便交易包裹

### 驗證
- [ ] 寫 1 個煙霧測試：能 insert user → insert room + 5 players → insert results
