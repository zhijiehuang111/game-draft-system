# 模組 4：Draft Engine

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §4
>
> 依賴：模組 0、1、2、3、6、7（Champion 常數）
>
> 房間狀態機：建房 → initial-pick → bench-trade → lock-in → done；server-authoritative 倒數。

## 子任務

### Champion 常數

- [x] `packages/shared/src/champions.ts`：固定一份英雄清單（至少 20 隻，含 `id` / `name` / `imageUrl`）
- [x] `GET /api/champions` 直接回傳該常數（無需 auth）

### Room runtime 資料結構

- [x] `apps/server/src/draft/types.ts`：對齊 §4.3 的 `Phase` / `RoomState` / `PlayerState`（與 shared 共用）
- [x] `apps/server/src/draft/RoomRegistry.ts`：`Map<roomId, Room>`、`getByUser(userId)`、`add`、`remove`
- [x] `apps/server/src/draft/Room.ts`：封裝單一房間生命週期方法（狀態、計時器、事件入口）

### 隨機分配

- [x] `allocateChampions(players, championPool)`：
  - [x] 每人隨機 n ∈ {2,3}
  - [x] 從洗牌後 pool 切片，確保 4 人 allocated 不重複
  - [x] 寫入 `PlayerState.allocated`
- [x] 寫單元測試（給定固定 seed 驗證不重複、張數正確）

### 階段切換 / 倒數

- [x] `transitionTo(phase, durationMs)`：設 `phaseEndsAt = now + duration`、清舊 timer、設新 `setTimeout`、廣播 `room:phase`
- [x] 階段時長常數：`INITIAL_PICK = 15_000`、`BENCH_TRADE = 45_000`、`LOCK_IN = 3_000`
- [x] 廣播 payload 含 `phase`、`phaseEndsAt`、`serverNow = Date.now()`
- [x] `room:state` 廣播亦帶 `serverNow`

### 階段 1：Initial Pick

- [x] `createRoom(roomId, players)`：建 Room、執行分配、`transitionTo('initial-pick')`、對 4 人 emit `room:state`
- [x] 事件 `pick:initial { championId }`：
  - [x] 驗 phase、championId ∈ allocated、currentChampion === null
  - [x] 通過 → 寫入 currentChampion、廣播 `room:state`
  - [x] 失敗 → 對該 socket emit `error { code, message }`
- [x] 倒數結束 callback：未選者由 server 隨機補一 → `transitionTo('bench-trade')`、初始化 bench
- [x] `bench = (∪ allocated) − (∪ currentChampion)`

### 階段 2：Bench & Trade（pick 部分）

- [x] 事件 `pick:bench { championId }`：
  - [x] 驗 phase、championId ∈ bench、玩家無 pending trade（呼叫 Trade 模組查詢）
  - [x] 原子操作：`bench.delete(championId)`、`bench.add(player.currentChampion)`、`player.currentChampion = championId`
  - [x] 廣播 `room:state`
- [x] 倒數結束 → `transitionTo('lock-in')`

### 階段 3：Lock-in

- [x] 凍結所有 `pick:*` / `trade:*`，一律回 `error { code: 'phase-locked' }`
- [x] 3 秒倒數結束：
  - [x] `draft_results.insertMany(4)`
  - [x] 廣播 `room:result`，payload 為 `DraftResult[]`
  - [x] `phase = 'done'`，記憶體狀態保留一段時間後清除（例如 60s 後 RoomRegistry.remove）

### Sequential 事件處理

- [x] Room 內部維持單一 mutex / async queue（node 單執行緒即可保證；以方法呼叫順序體現）
- [x] 確認所有 `pick:*`、`trade:*` 事件都通過 Room 統一入口（不繞過）

### 前端

- [x] `RoomScreen.tsx` 框架：依 `currentRoom.phase` 切換子畫面（InitialPick / BenchTrade / LockIn）
- [x] `Countdown.tsx`：訂閱 `phaseEndsAt + offset`，每 100ms 重算剩餘秒數
- [x] 啟動時 fetch `/api/champions` → `championsSlice.setChampions`
- [x] `InitialPickScreen`：渲染自己 allocated 卡片、點擊 → emit `pick:initial`
- [x] `BenchTradeScreen`：渲染所有玩家卡 + 板凳區、點板凳卡 → emit `pick:bench`
- [x] `LockInScreen`：純動畫畫面
- [x] `ResultScreen`：訂閱 `room:result`、顯示 4 人最終英雄

### 驗證

- [x] 4 人完整跑完一局（不交換）→ 寫入 draft_results
- [x] 階段 1 不選 → 自動補選
- [x] 階段 2 換到 / 從板凳挑 → 廣播即時反映
- [x] Lock-in 期間操作被拒
