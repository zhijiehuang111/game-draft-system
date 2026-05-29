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

- [x] 事件 `room:join { roomId }`：
  - [x] 驗證 userId 屬於該 room（查 RoomRegistry）
  - [x] socket.join(`room:${roomId}`)、registry.setRoom
  - [x] 若房間記憶體有該 user 標 disconnected → 清掉、廣播 `player:reconnected`（`engine.handleRoomJoin` 內呼叫 `room.clearDisconnected`）
  - [x] emit `room:state`（完整快照）給該 socket

### 斷線 grace period

- [x] socket `disconnect` handler（`apps/server/src/realtime/io.ts`）：
  - [x] 若該 user 不在 room → 只清 matchmaker + registry
  - [x] 若在 room → 呼叫 `engine.markUserDisconnected` → `room.markDisconnected`：標 `disconnected[userId] = Date.now()`、廣播 `player:disconnected`、設 `setTimeout(15_000, checkStillGone)`
- [x] `Room.checkStillGone(userId)`：
  - [x] 若 phase 已 `done` / `aborted` → no-op
  - [x] 若 user 已重連（不在 `disconnected`）→ no-op
  - [x] 否則：呼叫 `room.abort('player-left')` → 清所有 timer、廣播 `room:aborted`、`onClosed(roomId)` 釋放記憶體
- [x] 重連入口為 `room:join`（client 自動 emit，見前端段）

### 主動離房 / 登出

- [x] 登出時 client 主動斷 socket → server 視為 disconnect → 進入 grace period（policy 一致；client 端 `logout()` 已呼叫 `disconnectSocket()`）
- [x] 若處於 lobby（無 room）→ 從 Matchmaker 佇列移除（disconnect handler 走 else 分支）

### 錯誤事件

- [x] 統一 `socket.emit('error', { code, message })`，不踢人
- [x] 在共用模組封裝 `replyError(socket, code, message)`

### 前端

- [x] `socketSlice.connect()`：`io()` 同源連線、cookie 自動帶
- [x] reconnect 設定：socket.io client 預設 `reconnection: true`，確認 reconnect 後自動 emit `room:join`（讀 store 內 `currentRoom.roomId`，見 `apps/client/src/socket/setup.ts:14-19`）
- [x] 收到 `room:state` → `roomSlice.setRoomState`
- [x] 收到 `room:aborted` → toast「對手離線，房間已關閉」→ 清 currentRoom → 回 Lobby（`showToast` 模組級註冊 + setState 清 room）
- [x] 收到 `player:disconnected` / `player:reconnected` → 寫入 `currentRoom.disconnected`，PlayerCard `opacity-50 grayscale` + `offline` 文字標示（`InitialPickScreen` / `BenchTradeScreen`）

### 驗證

- [x] 4 人對局中關掉某一人分頁 → 其餘 3 人看到 disconnected 標示 → 15s 後全房 `room:aborted` 回 Lobby（手動測試待跑）
- [x] 同分頁網路抖動（DevTools `engine.close()` / Offline 切回 Online）→ 15s 內 socket.io 自動重連 + client emit `room:join` → 其他人看到 `player:reconnected`（手動測試待跑）
- [x] 同帳號開第二分頁登入 → 第一分頁被踢（`registry.bind` 強制 disconnect 舊 socket），舊 socket 觸發 grace period，新分頁無 `currentRoom` 不會 emit `room:join` → 15s 後 abort，與 spec §6.3 「主動關閉」分支一致

> **設計決議**：重整 / 關閉分頁視為 spec §6.3 的「主動關閉」分支 → 走 abort 路徑，不嘗試 server-side 自動 rejoin 或 client-side persist `currentRoom`。同分頁的 socket.io 自動重連仍正常運作（store 還在記憶體，會自動 emit `room:join`）。
