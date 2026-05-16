# 模組 3：Matchmaking

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §3
>
> 依賴：模組 0、1、2、6（最低限度：socket 已可握手）
>
> 全域 FIFO 佇列、湊滿 5 人建房、Lobby UI。

## 子任務

### 後端 Matchmaker
- [ ] `packages/server/src/matchmaking/Matchmaker.ts`：
  - [ ] `queue: Array<{ userId, socketId, joinedAt }>`
  - [ ] `inQueue: Map<string, true>`
  - [ ] `join(userId, socketId)`：重複加入回 no-op；否則 enqueue + 廣播
  - [ ] `leave(userId)`：移除 + 廣播
  - [ ] `tryMatch()`：每次 join 後呼叫，達 5 人才觸發
- [ ] 觸發建房流程：
  - [ ] shift 5 人 → 開 transaction → `rooms.insert(status='drafting')` → `room_players.insert x5`（slot 0~4）
  - [ ] 呼叫 Draft Engine `createRoom(roomId, players)`（先預留介面，實作隨模組 4 跟進）
  - [ ] 對 5 人 emit `room:start { roomId }`
  - [ ] 對 lobby 全員 emit `queue:update { size }`
- [ ] 註冊 socket 事件：`queue:join`、`queue:leave`
- [ ] 佇列中玩家 socket disconnect → 自動 leave + 廣播

### Socket 事件
- [ ] `queue:update` payload `{ size, position }`：position 對在佇列者；對非佇列者不傳或為 null
- [ ] 廣播策略：對全 lobby（namespace 預設 `/`）廣播 size，個別 emit position 給對應使用者

### 前端 Lobby
- [ ] `packages/client/src/screens/LobbyScreen.tsx`：顯示佇列人數、加入 / 離開按鈕、登出按鈕
- [ ] `lobbySlice`：`queueSize`、`inQueue`、`setQueue(size, inQueue)`
- [ ] socket handler：訂閱 `queue:update` 寫入 store
- [ ] 「加入佇列」→ `socket.emit('queue:join')`、「離開佇列」→ `socket.emit('queue:leave')`
- [ ] 收到 `room:start { roomId }` → `roomSlice.setCurrentRoom({ roomId, phase: 'initial-pick' as placeholder })` → App 條件渲染切到 RoomScreen
- [ ] 登出按鈕：呼叫 logout API → store.logout()（清 user / room / queue）→ 斷 socket

### 驗證
- [ ] 開 5 個分頁分別登入 5 個帳號，依序加入佇列 → 全部進入 RoomScreen
- [ ] 同帳號重複加入 → 不增加 queue size
- [ ] 加入後直接關分頁 → queue size 減 1
