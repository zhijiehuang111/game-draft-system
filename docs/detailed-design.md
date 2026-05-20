# LoL 風格配對與選角系統 — 詳細設計文檔

> 上游：[`docs/proposal.md`](./proposal.md)
>
> 本文件依「領域 + 端」中顆粒度切分為 7 個模組，每個模組描述職責、對外介面、關鍵流程。
> Auth 採 **JWT + httpOnly cookie**；英雄資料採 **shared 常數**（未來可平滑遷移到 DB）。

---

## 0. 模組總覽

| #   | 模組                 | 主要職責                                                  |
| --- | -------------------- | --------------------------------------------------------- |
| 1   | Data Layer           | DB schema、migration；劃定 DB 持久化 vs 記憶體 runtime 邊界 |
| 2   | Auth                 | 註冊 / 登入 / 身份查驗、JWT 簽發、Socket.IO 握手           |
| 3   | Matchmaking          | 全域佇列、湊滿 5 人建房、Lobby UI                          |
| 4   | Draft Engine         | 房間狀態機、階段流轉、倒數、Initial Pick、Lock-in、結算    |
| 5   | Trade                | 板凳挑選、1v1 交換申請、原子性與限制                       |
| 6   | Realtime / Reconnect | Socket.IO 連線、斷線 grace period、房間作廢                |
| 7   | Frontend Shell       | 條件渲染、Zustand store、Champion 常數載入、Socket 生命週期 |

依賴方向（A → B 表示 A 依賴 B）：

```mermaid
flowchart LR
  FE[Frontend Shell] --> Auth
  FE --> MM[Matchmaking]
  FE --> DE[Draft Engine]
  FE --> Trade
  FE --> RT[Realtime]
  MM --> DE
  DE --> Trade
  DE --> RT
  DE --> DL[Data Layer]
  Trade --> DE
  RT --> Auth
  Auth --> DL
```

---

## 1. Data Layer

### 1.1 職責

- 提供 PostgreSQL schema、migration、種子資料規範
- 劃定「進 DB」與「留在記憶體」的邊界
- 維護 `packages/shared` 內共用型別與資料庫欄位對齊

### 1.2 設計原則：DB vs 記憶體

| 類別            | 範例                                                  | 落腳處             |
| --------------- | ----------------------------------------------------- | ------------------ |
| 跨 session 持久 | users、draft_results                                  | **PostgreSQL**     |
| Runtime 活動    | 房間 metadata / phase / allocations / picks / trades / 倒數計時 | **記憶體（單機）** |
| 靜態查表        | champions                                             | **shared 常數**    |

理由：單一房間生命週期約 60 秒、socket 事件高頻；逐筆寫 DB 對展示專案無收益，且引入額外失敗模式。房間整個生命週期完全在記憶體跑（roomId 由 `crypto.randomUUID()` 產生）；DB 寫入只發生在 **1 個時點**：

1. **結算**：`INSERT draft_results x5`（lock-in 結束時）

作廢的房間不落 DB——`room:aborted` 事件廣播完即釋放記憶體，運營端如需統計用 log / metrics 處理。

### 1.3 DDL

```sql
-- 玩家帳號
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 最終結果（phase=done 時寫入）
-- room_id 是 in-memory 房間的 UUID，作為同一局 5 筆 row 的分組鍵（無 FK）
CREATE TABLE draft_results (
  room_id           UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES users(id),
  final_champion_id VARCHAR(32) NOT NULL,
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_results_user ON draft_results(user_id);
```

說明：

- 不存 in-room 中繼狀態（allocated / currentChampion / phase / bench）：runtime 變動頻繁全在記憶體，最終值入 `draft_results`
- 不建 `rooms` 表：房間生命週期短、metadata 全在記憶體，沒有完局後查詢場景；唯一持久化的「曾發生過 draft」訊號就是 5 筆 `draft_results`
- 不建 `trades` 表：交換生命週期僅在房內，房間結束即丟棄
- 房間玩家 N:M 中介表省略：`draft_results` 已涵蓋完局後 user ↔ room 對應
- 未來若需 custom 房 / 邀請碼 / replay / 作廢房紀錄，再加對應表

---

## 2. Auth 模組

### 2.1 職責

- 註冊、登入、查驗目前身份、登出
- JWT 簽發與驗證
- 提供 Socket.IO middleware：透過 cookie 取得 `userId`，注入至 `socket.data`

### 2.2 REST 介面

| Method | Path                 | Body                     | 成功回應                       | 備註           |
| ------ | -------------------- | ------------------------ | ------------------------------ | -------------- |
| POST   | `/api/auth/register` | `{ username, password }` | `{ user: { id, username } }`   | 同時設 cookie  |
| POST   | `/api/auth/login`    | `{ username, password }` | `{ user: { id, username } }`   | 設 cookie      |
| POST   | `/api/auth/logout`   | –                        | `{ ok: true }`                 | 清 cookie      |
| GET    | `/api/auth/me`       | –                        | `{ user: { id, username } }`   | 未登入回 401   |

錯誤回應一律 `{ error: { code, message } }`，HTTP 400 / 401 / 409。

### 2.3 JWT 規格

- Algorithm：`HS256`，密鑰 `JWT_SECRET`
- Payload：`{ sub: userId, iat, exp }`，有效期 7 天
- 儲存：**httpOnly cookie**
  - `httpOnly: true`、`sameSite: 'Lax'`、`secure: true`（production）
  - `path: '/'`、`maxAge: 7d`

### 2.4 密碼

- bcrypt cost = 12
- 註冊時驗證 username 唯一（DB unique 約束 + 預檢查）

### 2.5 後端中介層

- `requireAuth(req, res, next)`：解析 cookie → 驗 JWT → 注入 `req.userId`；失敗回 401
- 應用於除 `/api/auth/register`、`/api/auth/login`、`/api/champions` 外的所有 endpoint

### 2.6 Socket.IO 握手

```ts
io.use((socket, next) => {
  const token = parseCookie(socket.handshake.headers.cookie)?.token;
  const userId = verifyJwt(token);
  if (!userId) return next(new Error('unauthorized'));
  socket.data.userId = userId;
  next();
});
```

前後端同源部署（見附錄 D），不需設定 CORS。

### 2.7 前端

- `AuthScreen` 提供 register / login 兩個切換的表單
- App 啟動時呼叫 `GET /api/auth/me`：
  - 200 → 設定 `store.user`，建立 socket 連線
  - 401 → 顯示 `AuthScreen`
- 不於 JS 端讀寫 token（httpOnly）；同源部署下瀏覽器會自動帶上 cookie

---

## 3. Matchmaking 模組

### 3.1 職責

- 維護單一全域 FIFO 佇列
- 湊滿 5 人 → 通知 Draft Engine 建房 → 通知 5 名 client
- 處理重複加入、佇列中斷線

### 3.2 記憶體資料結構

```ts
class Matchmaker {
  private queue: Array<{ userId: string; socketId: string; joinedAt: number }>;
  private inQueue: Map<string, true>; // userId -> 在佇列中（防重複）
}
```

### 3.3 佇列流程

```mermaid
sequenceDiagram
  participant C as Client
  participant MM as Matchmaker
  participant DE as Draft Engine
  participant DB as PostgreSQL
  participant Lobby as All Lobby Clients
  participant Room as Matched 5 Clients

  C->>MM: queue:join (via socket)
  MM->>MM: 若已在佇列則 no-op；否則 enqueue
  MM-->>Lobby: queue:update { size }

  alt queue.length >= 5
    MM->>MM: shift 5 人 + 產生 roomId（UUID）
    MM->>DE: createRoom(roomId, players)
    MM-->>Room: room:start { roomId }
    MM-->>Lobby: queue:update { size }
  end
```

### 3.4 規則

- 同一 `userId` 重複 `queue:join` → 視為 no-op
- 佇列中玩家斷線 → 從佇列移除、廣播 `queue:update`
- 玩家收到 `room:start` 後，client 自動 emit `room:join { roomId }`（由 Realtime 模組接手）

### 3.5 前端 Lobby

- 顯示佇列人數（訂閱 `queue:update`）
- 「加入佇列 / 離開佇列」按鈕
- 「登出」按鈕（呼叫 `POST /api/auth/logout` + 中斷 socket）
- 收到 `room:start` → store 設 `currentRoom.roomId` → App 條件渲染切到 `RoomScreen`

---

## 4. Draft Engine 模組

### 4.1 職責

- 維護單一房間的完整生命週期（建房 → 階段流轉 → 結算 / 作廢）
- Server-authoritative 倒數計時與狀態機
- 隨機分配英雄、Initial Pick 補選、Lock-in、結果落庫

### 4.2 房間狀態機

```mermaid
stateDiagram-v2
  [*] --> initial_pick: 建房 + 隨機分配
  initial_pick --> bench_trade: 倒數到 0（未選者隨機補一）
  bench_trade --> lock_in: 倒數到 0
  lock_in --> done: 3s 動畫結束 + 寫入 draft_results
  done --> [*]

  initial_pick --> aborted: 有人離開逾 15s
  bench_trade --> aborted: 有人離開逾 15s
  lock_in --> aborted: 有人離開逾 15s
  aborted --> [*]
```

### 4.3 Room runtime 狀態（記憶體）

```ts
type Phase = 'initial-pick' | 'bench-trade' | 'lock-in' | 'done' | 'aborted';

interface RoomState {
  roomId: string;
  phase: Phase;
  phaseEndsAt: number;          // epoch ms，server-authoritative
  serverNow: number;            // epoch ms，快照時 server 時間，供 client 校正時鐘偏移
  players: PlayerState[];        // 5 人
  bench: string[];               // 階段 2 可挑英雄
  pendingTrade: TradeRequest | null;
  disconnected: Map<string, number>; // userId -> disconnectedAt
}

interface PlayerState {
  userId: string;
  username: string;
  slot: number;                    // 0~4
  allocated: string[];             // 階段 1 被分配（2~3 隻）
  currentChampion: string | null;  // 目前持有；階段 1 結束才非 null
}
```

### 4.4 隨機分配規則

1. 每位玩家分配張數 `n_i ∈ {2, 3}` 隨機決定
2. 從 Champion 全清單洗牌後切片：總抽取數 `sum(n_i) ∈ [10, 15]`
3. **房內英雄唯一**：5 名玩家的 `allocated` 不重複
4. 結果寫入各 `PlayerState.allocated`

### 4.5 倒數計時（Server-authoritative）

- 進入新階段時：`phaseEndsAt = Date.now() + duration`
- 啟動 `setTimeout(duration)` 觸發階段切換
- 廣播 `room:phase { phase, phaseEndsAt, serverNow }`；前端用 `phaseEndsAt` 自行計算剩餘秒數，**不依賴 server tick**
- 前端以 `serverNow` 校正 client 時鐘偏移：`offset = serverNow - Date.now()`，之後 `remaining = phaseEndsAt - (Date.now() + offset)`
- 斷線重連：client 收到 `room:state` 後直接用同樣公式重算剩餘時間，無需額外同步
- 階段切換一律等 `setTimeout` 到時觸發，不做提前完成
- 階段時長依 proposal §4.1：Initial Pick 15s、Bench & Trade 45s、Lock-in 3s

### 4.6 階段 1：Initial Pick

- 接收 `pick:initial { championId }`
- 驗證：
  - `phase === 'initial-pick'`
  - `championId ∈ player.allocated`
  - `player.currentChampion === null`（不可改選）
- 寫入 `currentChampion`、廣播 `room:state`
- 倒數到 0 才進入階段 2；未選者由 server 從 `allocated` 隨機補一

### 4.7 階段 2：Bench & Trade

- 進入此階段時建立 `bench = (全房 allocated 集合) - (全房 currentChampion 集合)`
- 接收 `pick:bench { championId }`：
  - 驗證：`phase === 'bench-trade'`、`championId ∈ bench`
  - 原子操作：`bench.remove(championId)` → `bench.add(player.currentChampion)` → `player.currentChampion = championId`
  - 廣播 `room:state`
- 接收 `trade:request` / `trade:respond`：交由 Trade 模組處理
- 倒數到 0 → 進入階段 3

### 4.8 階段 3：Lock-in

- 凍結：拒絕所有 `pick:*`、`trade:*`（回 `error { code: 'phase-locked' }`）
- 倒數 3 秒視覺動畫
- 動畫結束：
  1. `INSERT draft_results` x5（依 `currentChampion`）
  2. 廣播 `room:result`
  3. `phase = 'done'`，房間記憶體狀態保留供 client 顯示後續查詢，X 秒後釋放

### 4.9 介面契約（Socket）

繼承 proposal §5.2，本模組強化驗證規則：

| 事件             | 驗證                                                          | 失敗回應                   |
| ---------------- | ------------------------------------------------------------- | -------------------------- |
| `pick:initial`   | phase=initial-pick、championId ∈ allocated、尚未 pick         | `error { code, message }`  |
| `pick:bench`     | phase=bench-trade、championId ∈ bench                         | `error { code, message }`  |
| `room:join`      | userId 屬於該 roomId                                          | 斷線                        |

**錯誤策略**：非法操作只回 `error` 給該 client，不踢人、不中斷房間（避免少數 client bug 拖垮整局）。

---

## 5. Trade 模組

### 5.1 職責

- 處理 1v1 交換申請、回應、超時
- 確保雙方英雄互換的原子性
- 限制同時申請數

### 5.2 資料結構

```ts
interface TradeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  offerChampionId: string; // from 拿出（= fromUser.currentChampion 當下值）
  wantChampionId: string;  // 想換（= toUser.currentChampion 當下值）
  createdAt: number;
  expiresAt: number;       // createdAt + 10_000
}
```

### 5.3 規則

- 每位玩家任意時刻最多涉入 1 筆 pending trade（不分發起方或接收方）（proposal §4.2）
- 申請建立後，雙方在解析前不可發 `pick:bench`、發起新 `trade:request`、或接收他人的 `trade:request`（鎖定）
- 10 秒超時 → 自動視為拒絕

### 5.4 交換流程

```mermaid
sequenceDiagram
  participant A as Client A
  participant S as Server (Draft Engine)
  participant B as Client B

  A->>S: trade:request { targetUserId=B, offer, want }
  S->>S: 驗證（A 持有 offer? B 持有 want? A、B 皆無任何 pending trade?）
  alt 驗證失敗
    S-->>A: error { code }
  else 驗證通過
    S->>S: 建 TradeRequest，鎖定 A、B
    S-->>B: trade:incoming { tradeId, fromA, offer, want }
    S-->>A: trade:pending { tradeId }

    alt B 接受
      B->>S: trade:respond { tradeId, accept=true }
      S->>S: 原子互換 A.currentChampion ↔ B.currentChampion
      S-->>A: trade:resolved { tradeId, accepted=true }
      S-->>B: trade:resolved { tradeId, accepted=true }
      S-->>All: room:state
    else B 拒絕 / 10s 逾時
      B->>S: trade:respond { tradeId, accept=false }
      Note over S: 或 expiresAt 到期
      S-->>A: trade:resolved { tradeId, accepted=false }
      S-->>B: trade:resolved { tradeId, accepted=false }
    end
    S->>S: 解除鎖定
  end
```

### 5.5 競態處理

- 所有 trade / pick 事件在單一 room 物件內 **sequential 處理**（Node.js 單執行緒 event loop，不需鎖原語）
- 「A 與 C 同時對 B 發起申請」：先到達的成功建立鎖定 B；後到達者收到 `error { code: 'target-busy' }`
- 「A 已有 pending（無論發起或接收），又發 `trade:request`」：拒絕，回 `error { code: 'has-pending-trade' }`
- 「A 已有 pending，C 嘗試對 A 發起」：拒絕，回 `error { code: 'target-busy' }`
- 「申請建立後 A 嘗試 pick:bench」：拒絕，回 `error { code: 'has-pending-trade' }`
- 申請建立的瞬間 snapshot 雙方 `currentChampion`；解析時雙方持有的英雄與 snapshot 一致才能成立（防超詭異邊界）

### 5.6 新增介面

繼承 proposal §5.2 的 `trade:request` / `trade:respond` / `trade:incoming` / `trade:resolved`；額外：

| 方向 | 事件            | Payload          | 說明                       |
| ---- | --------------- | ---------------- | -------------------------- |
| S→C  | `trade:pending` | `{ tradeId }`    | 對發起方確認申請已建立     |

**廣播範圍**：

| 事件              | 收件對象       | 說明                                                        |
| ----------------- | -------------- | ----------------------------------------------------------- |
| `trade:incoming`  | 接收方 B       | 只有被申請者需要彈窗                                        |
| `trade:pending`   | 發起方 A       | 只有發起者需要「等待回應中」狀態                            |
| `trade:resolved`  | 雙方 A、B      | 用於關閉 modal / 顯示結果；其他玩家未知此交易存在，不需發送 |
| `room:state`      | 房內全員       | 接受成功時棋盤狀態改變，其他玩家靠這個看到英雄互換          |

---

## 6. Realtime / Reconnect 模組

### 6.1 職責

- Socket.IO 命名空間管理（`/`、`/room`）
- userId ↔ socketId 對映、單一連線
- 斷線 grace period（15 秒）
- 重連狀態快照推送、房間作廢廣播

### 6.2 記憶體結構

```ts
class RealtimeRegistry {
  socketByUser: Map<string, string>;  // userId -> socketId
  roomByUser: Map<string, string>;    // userId -> roomId（若在房中）
}
```

- 同一 user 後續連線（多分頁、刷新、重連）：踢掉舊 socket、保留 user-room 綁定
- Client 於 `connect` 後若本地有 `currentRoomId`，自動 emit `room:join`

### 6.3 斷線 / 重連流程

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  participant Others as 其餘 4 人

  C--xS: disconnect
  S->>S: roomState.disconnected[userId] = now
  S-->>Others: player:disconnected { userId }
  S->>S: setTimeout(15_000) → checkStillGone

  alt 15s 內重連
    C->>S: connect (含 cookie)
    C->>S: room:join { roomId }
    S->>S: 驗證 userId 屬於該房；clear disconnected[userId]
    S-->>C: room:state (完整快照)
    S-->>Others: player:reconnected { userId }
  else 逾時 / 主動關閉
    S->>S: phase = aborted
    S-->>All: room:aborted { reason: 'player-left' }
    S->>S: 釋放房間記憶體狀態
  end
```

### 6.4 新增介面

繼承 proposal §5.2；本模組新增：

| 方向 | 事件                  | Payload              | 說明                       |
| ---- | --------------------- | -------------------- | -------------------------- |
| S→C  | `player:disconnected` | `{ userId }`         | 某玩家暫離                  |
| S→C  | `player:reconnected`  | `{ userId }`         | 某玩家回來                  |
| S→C  | `error`               | `{ code, message }`  | 非法操作回報（不踢人）      |

---

## 7. Frontend Shell 模組

### 7.1 職責

- 全域畫面切換（條件渲染、無路由）
- Zustand store 結構設計
- Champion 常數載入與快取
- Socket 連線在 React 樹外的生命週期管理

### 7.2 畫面條件渲染

```ts
function App() {
  const user = useAppStore(s => s.user);
  const room = useAppStore(s => s.currentRoom);

  if (!user) return <AuthScreen />;
  if (!room) return <LobbyScreen />;
  if (room.phase === 'done') return <ResultScreen />;
  return <RoomScreen />; // initial-pick / bench-trade / lock-in
}
```

`room.phase === 'aborted'`：toast 提示後 `room = null`，自動回到 Lobby。

### 7.3 Zustand store 切片

採用 **單一 store + slice pattern**（Zustand 官方推薦）：對外仍是一個 `useAppStore`，內部按 domain 拆成獨立 slice 檔，PR review 容易、跨 slice 仍可互通（例如 `logout` 一次重置多個切片）。

```ts
// stores/authSlice.ts
export interface AuthSlice {
  user: { id: string; username: string } | null;
  setUser(u: User | null): void;
  logout(): void;            // 同時清空 room / lobby 等
}

// stores/championsSlice.ts（啟動時載入後不變）
export interface ChampionsSlice {
  champions: Record<string, Champion>;
  setChampions(list: Champion[]): void;
}

// stores/lobbySlice.ts
export interface LobbySlice {
  queueSize: number;
  inQueue: boolean;
  setQueue(size: number, inQueue: boolean): void;
}

// stores/roomSlice.ts
export interface RoomSlice {
  currentRoom: RoomState | null;
  pendingTradeIncoming: TradeRequest | null;
  pendingTradeOutgoing: { tradeId: string } | null;
  setRoomState(s: RoomState): void;
  applyPhaseChange(phase: Phase, phaseEndsAt: number, serverNow: number): void;
}

// stores/socketSlice.ts
export interface SocketSlice {
  socket: Socket | null;
  connect(): void;
  disconnect(): void;
}

// stores/index.ts
export type AppStore = AuthSlice & ChampionsSlice & LobbySlice & RoomSlice & SocketSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createChampionsSlice(...a),
  ...createLobbySlice(...a),
  ...createRoomSlice(...a),
  ...createSocketSlice(...a),
}));
```

每個 slice 透過 `StateCreator<AppStore, [], [], XxxSlice>` 定義，仍可在 action 內以 `set` 修改 `AppStore` 任一欄位（解決跨 slice 重置 / 連動需求）。

各元件透過 selector 訂閱對應欄位（避免全樹 re-render）：

| 元件          | 訂閱                              |
| ------------- | --------------------------------- |
| `PlayerCard`  | `currentRoom.players[i]`          |
| `Bench`       | `currentRoom.bench`               |
| `Countdown`   | `currentRoom.phaseEndsAt`         |
| `TradeModal`  | `pendingTradeIncoming`            |

### 7.4 Champion 資料載入

- 來源：`packages/shared/champions.ts` 常數
- 後端：`GET /api/champions` 直接回該常數
- 前端：App mount 時 fetch 一次 → `setChampions` → 永不過期

**為何採常數而非 DB**

> MVP 階段資料固定、無後台管理需求；shared 套件確保前後端型別一致；省去 DB 表 + migration + seed 的維護成本。
>
> **未來擴充路徑**：若需動態管理（新增 / 停用英雄、版本化），新增 `champions` 表並以該常數作為初始 seed，`/api/champions` endpoint 與前端 `Champion` 型別不需修改。

英雄資料結構：

```ts
interface Champion {
  id: string;       // 'ahri'、'garen'
  name: string;     // '九尾妖狐'
  imageUrl: string; // 圖片相對路徑
  // 未來可加 roles、tags
}
```

### 7.5 Socket 連線生命週期

- 登入成功 / `auth/me` 200 → `store.connect()` → `io()`（同源連線，cookie 自動帶上）
- 登出 / 401 → `store.disconnect()`
- 所有 server-push 事件 handler 直接呼叫 store setter（在 React 樹外更新狀態）

---

## 附錄 A：Socket 事件總表

整合 proposal §5.2 與本文件新增事件：

| 方向 | 事件                  | Payload                                                    | 模組         |
| ---- | --------------------- | ---------------------------------------------------------- | ------------ |
| C→S  | `queue:join`          | –                                                          | Matchmaking  |
| C→S  | `queue:leave`         | –                                                          | Matchmaking  |
| S→C  | `queue:update`        | `{ size, position }`                                       | Matchmaking  |
| S→C  | `room:start`          | `{ roomId }`                                               | Matchmaking  |
| C→S  | `room:join`           | `{ roomId }`                                               | Realtime     |
| S→C  | `room:state`          | `RoomState`                                                | Draft Engine |
| S→C  | `room:phase`          | `{ phase, phaseEndsAt, serverNow }`                        | Draft Engine |
| C→S  | `pick:initial`        | `{ championId }`                                           | Draft Engine |
| C→S  | `pick:bench`          | `{ championId }`                                           | Draft Engine |
| C→S  | `trade:request`       | `{ targetUserId, offerChampionId, wantChampionId }`        | Trade        |
| C→S  | `trade:respond`       | `{ tradeId, accept }`                                      | Trade        |
| S→C  | `trade:incoming`      | `TradeRequest`                                             | Trade        |
| S→C  | `trade:pending`       | `{ tradeId }`                                              | Trade        |
| S→C  | `trade:resolved`      | `{ tradeId, accepted }`                                    | Trade        |
| S→C  | `room:result`         | `DraftResult[]`                                            | Draft Engine |
| S→C  | `room:aborted`        | `{ reason }`                                               | Realtime     |
| S→C  | `player:disconnected` | `{ userId }`                                               | Realtime     |
| S→C  | `player:reconnected`  | `{ userId }`                                               | Realtime     |
| S→C  | `error`               | `{ code, message }`                                        | All          |

---

## 附錄 B：REST 端點總表

| Method | Path                 | 認證 | 模組        |
| ------ | -------------------- | ---- | ----------- |
| POST   | `/api/auth/register` | 否   | Auth        |
| POST   | `/api/auth/login`    | 否   | Auth        |
| POST   | `/api/auth/logout`   | 是   | Auth        |
| GET    | `/api/auth/me`       | 是   | Auth        |
| GET    | `/api/champions`     | 否   | Frontend Shell |

---

## 附錄 C：環境變數

| 變數            | 說明                                | 範例                                   |
| --------------- | ----------------------------------- | -------------------------------------- |
| `DATABASE_URL`  | Postgres 連線字串                   | `postgres://user:pass@localhost/draft` |
| `JWT_SECRET`    | JWT 簽章密鑰                        | 64-byte 隨機字串                       |
| `NODE_ENV`      | `development` / `production`        | `production`                           |

---

## 附錄 D：同源部署策略

前後端統一在同一個 origin 對外暴露，瀏覽器視角永遠是同源，**不需處理 CORS、不需設定 `withCredentials`、cookie 自動帶上**。

### Dev：Vite proxy

`vite.config.ts`：

```ts
export default {
  server: {
    proxy: {
      '/api':       'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true }
    }
  }
}
```

- 前端打 `/api/...`、`/socket.io/...`，Vite dev server 轉發到後端
- `ws: true` 必須加，否則 WebSocket upgrade 不會被代理

### Prod：nginx 反向代理

```nginx
server {
  listen 443 ssl;
  server_name draft.example.com;

  location / {
    root /var/www/dist;
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://localhost:3000;
  }

  location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

- 前端靜態檔與 API 走同一個 host
- `/socket.io/` 三行 header 為 WebSocket 升級必需

### 後端 cookie 設定（同源前提下）

- `httpOnly: true`、`secure: true`（prod）、`sameSite: 'Lax'`、`path: '/'`
- 不需要 `sameSite: 'None'`、不需要設定 `domain`
