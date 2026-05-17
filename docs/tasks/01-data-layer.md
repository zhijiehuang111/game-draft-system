# 模組 1：Data Layer

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §1
>
> 依賴：模組 0
>
> 提供 PostgreSQL schema、migration 工具、shared 型別對齊；劃定 DB 與記憶體邊界。

## 子任務

### Postgres 環境

- [x] 建立 `docker-compose.yml`，提供本地 Postgres 服務（含 volume、port 5432）
- [x] 後端建立 `pg` Pool（`apps/server/src/db/pool.ts`），從 `DATABASE_URL` 載入

### Migration 機制

- [x] 建立 `apps/server/migrations/` 目錄
- [x] 撰寫 migration `001_init.sql`，包含 `users`、`rooms`、`room_players`、`draft_results` 4 張表
- [x] DDL 完全對齊 detailed-design §1.3（含索引、UNIQUE、CHECK、預留 `type`/`invite_code` 欄位）
- [x] 手動執行：`docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < apps/server/migrations/001_init.sql`，`\dt` 檢查 schema 正確（未來再導入 migration 工具）

### 共用型別

- [x] `packages/shared/src/types/db.ts`：與 DB 欄位對齊的 `User`、`Room`、`RoomPlayer`、`DraftResult` 型別
- [x] `packages/shared/src/types/room.ts`：runtime 用的 `Phase`、`RoomState`、`PlayerState`、`TradeRequest`
- [x] `packages/shared/src/index.ts` 統一 re-export
- [x] 兩邊 import 驗證：`apps/server` 與 `apps/client` 均可 import shared 型別

### Repository 層

- [x] `apps/server/src/db/repositories/users.repo.ts`：`createUser`、`findByUsername`、`findById`
- [x] `apps/server/src/db/repositories/rooms.repo.ts`：`createRoom`、`completeRoom`、`abortRoom`、`insertPlayers`
- [x] `apps/server/src/db/repositories/results.repo.ts`：`insertResults`（批次寫 5 筆）
- [x] 所有 repository 接受 `Pool | PoolClient`（`Db` 型別）參數，一次性查詢用 `pool`、交易包裹用 `pool.connect()` 取得 client

### 驗證

- [x] 寫 1 個煙霧測試：能 insert user → insert room + 5 players → insert results（`apps/server/src/db/smoke.ts`，`pnpm --filter @app/server smoke`，包 transaction + ROLLBACK 不留資料）
