# 模組 3：Matchmaking

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §3
>
> 依賴：模組 0、1、2、6（最低限度：socket 已可握手）
>
> 全域 FIFO 佇列、湊滿 5 人建房、Lobby UI。

## 子任務

### 後端 Matchmaker

- [x] `apps/server/src/matchmaking/Matchmaker.ts`：
  - [x] `queue: Array<{ userId, socketId, joinedAt }>`
  - [x] `inQueue: Map<string, true>`
  - [x] `join(userId, socketId)`：重複加入回 no-op；否則 enqueue + 廣播
  - [x] `leave(userId)`：移除 + 廣播
  - [x] `tryMatch()`：每次 join 後呼叫，達 5 人才觸發
- [x] 觸發建房流程：
  - [x] shift 5 人 → 產生 roomId（`crypto.randomUUID()`，不寫 DB）
  - [x] 呼叫 Draft Engine `createRoom(roomId, players)`（先預留介面，實作隨模組 4 跟進）
  - [x] 對 5 人 emit `room:start { roomId }`
  - [x] 對 lobby 全員 emit `queue:update { size }`
- [x] 註冊 socket 事件：`queue:join`、`queue:leave`
- [x] 佇列中玩家 socket disconnect → 自動 leave + 廣播

### Socket 事件

- [x] `queue:update` payload `{ size, position }`：position 對在佇列者；對非佇列者不傳或為 null
- [x] 廣播策略：對全 lobby（namespace 預設 `/`）廣播 size，個別 emit position 給對應使用者

### 前端 Lobby

- [x] `apps/client/src/screens/LobbyScreen.tsx`：顯示佇列人數、加入 / 離開按鈕、登出按鈕
- [x] `lobbySlice`：`queueSize`、`inQueue`、`setQueue(size, inQueue)`
- [x] socket handler：訂閱 `queue:update` 寫入 store
- [x] 「加入佇列」→ `socket.emit('queue:join')`、「離開佇列」→ `socket.emit('queue:leave')`
- [x] 收到 `room:start { roomId }` → `roomSlice.setCurrentRoom({ roomId, phase: 'initial-pick' as placeholder })` → App 條件渲染切到 RoomScreen
- [x] 登出按鈕：呼叫 logout API → store.logout()（清 user / room / queue）→ 斷 socket

### 驗證

- [x] 開 5 個分頁分別登入 5 個帳號，依序加入佇列 → 全部進入 RoomScreen
- [x] 同帳號第二處登入 → 第一處被踢、queue size 減 1
- [x] 加入後直接關分頁 → queue size 減 1
