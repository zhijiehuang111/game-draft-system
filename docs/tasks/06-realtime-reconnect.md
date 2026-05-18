# 模組 6：Realtime / Reconnect

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §6
>
> 依賴：模組 0、2（auth 握手）；其他模組共用本模組的 registry
>
> Socket.IO 命名空間、userId↔socketId 對映、斷線 15s grace、房間作廢。

## 子任務

### Socket.IO 基礎
- [x] `apps/server/src/realtime/io.ts`：建立 `Server`、整合 express http server
- [x] 套用 auth middleware（模組 2 已提供）
- [x] 預設 namespace `/` 用於 lobby；本專案 MVP 可只用預設 namespace，房間以 socket.io room 隔離（避免雙 namespace 維護成本）

### Registry
- [x] `apps/server/src/realtime/RealtimeRegistry.ts`：
  - [x] `socketByUser: Map<userId, socketId>`
  - [x] `roomByUser: Map<userId, roomId>`
  - [x] `bind(userId, socketId)`：若舊 socketId 存在則 disconnect 舊 socket
  - [x] `setRoom(userId, roomId)` / `clearRoom(userId)`
  - [x] `unbind(socketId)`：清除映射
- [x] connection handler：bind userId↔socket、加入個人 room（`socket.join(\`user:\${userId}\`)`）

### `room:join` 處理
- [ ] 事件 `room:join { roomId }`：
  - [ ] 驗證 userId 屬於該 room（查 RoomRegistry）
  - [ ] socket.join(`room:${roomId}`)、registry.setRoom
  - [ ] 若房間記憶體有該 user 標 disconnected → 清掉、廣播 `player:reconnected`
  - [ ] emit `room:state`（完整快照）給該 socket

### 斷線 grace period
- [ ] socket `disconnect` handler：
  - [ ] 若該 user 不在 room → 只清 registry
  - [ ] 若在 room → 標 `room.disconnected[userId] = Date.now()`、廣播 `player:disconnected`、設 `setTimeout(15_000, checkStillGone)`
- [ ] `checkStillGone(userId)`：
  - [ ] 若 user 已重連（disconnected 不存在）→ no-op
  - [ ] 否則：abortRoom（DB + 廣播 `room:aborted { reason: 'player-left' }`）、釋放記憶體
- [ ] 重連入口為 `room:join`（client 自動 emit）

### 主動離房 / 登出
- [ ] 登出時 client 主動斷 socket → server 視為 disconnect → 進入 grace period（policy 一致）
- [ ] 若處於 lobby（無 room）→ 從 Matchmaker 佇列移除

### 錯誤事件
- [x] 統一 `socket.emit('error', { code, message })`，不踢人
- [x] 在共用模組封裝 `replyError(socket, code, message)`

### 前端
- [ ] `socketSlice.connect()`：`io()` 同源連線、cookie 自動帶
- [ ] reconnect 設定：socket.io client 預設 `reconnection: true`，確認 reconnect 後自動 emit `room:join`（讀 store 內 `currentRoom.roomId`）
- [ ] 收到 `room:state` → `roomSlice.setRoomState`
- [ ] 收到 `room:aborted` → toast「對手離線，房間已關閉」→ 清 currentRoom → 回 Lobby
- [ ] 收到 `player:disconnected` / `player:reconnected` → PlayerCard 標示灰階 / 恢復

### 驗證
- [ ] 5 人對局中關掉某一人分頁 → 其餘 4 人看到 disconnected 標示
- [ ] 該玩家 10 秒內重開分頁登入 → 自動回房、其他人看到 reconnected
- [ ] 該玩家 15 秒未回 → 全房收到 `room:aborted`、DB `rooms.status='aborted'`
- [ ] 同帳號開第二分頁登入 → 第一分頁被踢
