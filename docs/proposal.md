# LoL 風格配對與選角系統 — 專案需求文件

---

## 1. 專案目的

模擬英雄聯盟「進房 → 系統分配 → 板凳挑選 → 互換 → 確認」的選角流程，
但 **不做實力分配機制**，配對採 **先到先配**。

展示重點：

- 即時多人協作（WebSocket / Socket.IO）
- 後端狀態機（選角階段切換、倒數計時）
- 全端 TypeScript（前後端共享型別）
- 完整部署在自有 VPS（可公開連線體驗）

---

## 2. Tech Stack

| 層       | 技術                                                               |
| -------- | ------------------------------------------------------------------ |
| 語言     | TypeScript（前後端共用 type）                                      |
| 前端     | Vite + React（不使用 meta framework）                              |
| 樣式     | Tailwind CSS                                                       |
| 後端     | Express（不使用 NestJS，保持輕量）                                 |
| 即時通訊 | Socket.IO                                                          |
| 資料庫   | PostgreSQL                                                         |
| Auth     | 簡易註冊登入（username + bcrypt password + JWT 或 session cookie） |
| 部署     | 自有 VPS（前後端 + Postgres，後續決定 docker-compose 或 PM2）      |

### Monorepo 結構建議

```
game-draft-system/
├── apps/
│   ├── server/      # Express + Socket.IO（可執行應用）
│   └── client/      # Vite + React（可執行應用）
├── packages/
│   └── shared/      # 共用型別（Champion、Room、SocketEvent 等）
├── docs/
└── package.json     # pnpm workspaces（apps/*、packages/*）
```

> 命名慣例：`apps/` 放可獨立啟動 / 部署的應用，`packages/` 放被 apps 引用的 library。
> 之後若新增其他共用 lib（例如 `eslint-config`、`tsconfig`），都歸到 `packages/`。

---

## 3. 範疇

### 3.1 MVP 必做

- 註冊 / 登入
- 加入單一全域佇列、湊滿 4 人自動建房
- 進房後系統隨機分配 2~3 隻英雄給每位玩家
- 第一階段：4 人同時各從自己被分配的 2~3 隻中選 1（短倒數）
- 未被選中的英雄進入「板凳區」
- 第二階段：所有玩家可從板凳區挑英雄，或向其他玩家發起 1 對 1 交換申請（需對方同意）
- 倒數結束 → 鎖定結果 → 寫入 `draft_results` → 顯示最終結果頁
- 斷線 grace period（15 秒）內可重連；超時或主動離開 = **房間作廢**，其餘玩家彈回 lobby

### 3.2 非範疇（明確不做）

- 實力分配 / MMR
- 5v5 / 多隊（單一房間 = 一隊 4 人）
- Ban 階段
- 房內聊天室
- 歷史記錄頁
- 音效
- 自建房 / 邀請碼（但 schema 預留欄位，方便日後擴充）
- 補位機制
- OAuth 登入

---

## 4. 核心使用者流程

```
Landing
  └─ 註冊 / 登入
       └─ Lobby（顯示「加入佇列」按鈕）
            └─ 點擊加入佇列
                 └─ Matchmaker 湊滿 4 人 → 建立 Room
                      └─ Room 頁面
                           ├─ 階段 1: Initial Pick（每人從 2~3 隻選 1）
                           ├─ 階段 2: Bench & Trade（自由換 + 1v1 交換申請）
                           ├─ 階段 3: Lock-in（鎖定 / 倒數結束）
                           └─ Result（顯示 4 人最終英雄）
```

### 4.1 階段時長

| 階段          | 預設秒數 | 備註                                           |
| ------------- | -------- | ---------------------------------------------- |
| Initial Pick  | 15s      | 倒數結束未選者 → 系統從其 2~3 隻中隨機指定一隻 |
| Bench & Trade | 45s      | 板凳挑選 + 互換申請皆在此階段                  |
| Lock-in 動畫  | 3s       | 純視覺，給 demo 一點儀式感                     |

### 4.2 交換申請規則

- A 點 B 的英雄卡（右下交換 icon） → 點「申請交換」→ 後端發 socket 事件給 B
- B 端跳出彈窗：「A 想用 [X] 跟你換 [Y]」→ 接受 / 拒絕 / 超時（10 秒自動拒絕）
- 接受 → 雙方英雄互換、廣播全房
- 同一時刻每位玩家最多涉入 1 筆 pending 申請（不論是發起方或接收方）；已在交換中則無法再發起或接收其他申請（避免複雜競態）

---

## 5. Socket.IO 事件設計

### 5.1 命名空間

- 預設 `/`（lobby / 佇列）
- `/room`（進房後使用）

### 5.2 事件清單

| 方向 | 事件             | Payload                                             | 說明                       |
| ---- | ---------------- | --------------------------------------------------- | -------------------------- |
| C→S  | `queue:join`     | –                                                   | 加入佇列                   |
| C→S  | `queue:leave`    | –                                                   | 離開佇列                   |
| S→C  | `queue:update`   | `{ size, position }`                                | 佇列人數變動               |
| S→C  | `room:start`     | `{ roomId }`                                        | 4 人到齊、建房通知         |
| C→S  | `room:join`      | `{ roomId }`                                        | 進房（rejoin 同此事件）    |
| S→C  | `room:state`     | `RoomState`                                         | 全狀態同步（進房或重連時） |
| S→C  | `room:phase`     | `{ phase, phaseEndsAt }`                            | 階段切換                   |
| C→S  | `pick:initial`   | `{ championId }`                                    | 階段 1 選角                |
| C→S  | `pick:bench`     | `{ championId }`                                    | 階段 2 從板凳挑            |
| C→S  | `trade:request`  | `{ targetUserId, offerChampionId, wantChampionId }` | 發起交換                   |
| C→S  | `trade:respond`  | `{ tradeId, accept }`                               | 回應交換                   |
| S→C  | `trade:incoming` | `TradeRequest`                                      | 收到交換邀請               |
| S→C  | `trade:resolved` | `{ tradeId, accepted }`                             | 交換結果廣播               |
| S→C  | `room:result`    | `DraftResult[]`                                     | 最終結果                   |
| S→C  | `room:aborted`   | `{ reason }`                                        | 房間作廢（有人離開）       |

### 5.3 重連策略

- Client 建立 socket 時帶 JWT；server 用 `userId` 比對是否有進行中的房間
- 斷線時不立刻判離：標記 `socketId=null`、`disconnectedAt=now()`、廣播 `player:disconnected`
- 15 秒內重連 → 推送完整 `room:state`、廣播 `player:reconnected`
- 超過 15 秒 → 廣播 `room:aborted`（reason: `'player-left'`）、房間狀態改 `aborted`

---

## 6. REST API

> 即時部分走 Socket.IO；REST 只處理 auth 與靜態資料。

| Method | Path                 | 用途                               |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/auth/register` | 註冊                               |
| POST   | `/api/auth/login`    | 登入，回傳 JWT                     |
| GET    | `/api/auth/me`       | 驗證目前登入身份                   |
| GET    | `/api/champions`     | 取得英雄全清單（前端啟動時 cache） |

---

## 7. 前端架構

### 7.1 不使用路由，改採條件渲染

由於房間無法被外部 deep link 進入（必須走配對佇列），URL 不承載任何業務資訊。
畫面切換由全域狀態決定，App 根組件做條件渲染：

| 畫面   | 顯示條件                                          | 主要內容                          |
| ------ | ------------------------------------------------- | --------------------------------- |
| Auth   | 未登入                                            | 登入 / 註冊                       |
| Lobby  | 已登入 + 不在房間                                 | 佇列人數、加入/離開佇列按鈕、登出 |
| Room   | 房間 phase ∈ initial-pick / bench-trade / lock-in | 階段 UI、倒數、板凳、交換彈窗     |
| Result | 房間 phase = done                                 | 4 人最終英雄                      |

> 日後若要做自建房邀請連結（URL 真的承載資訊時）再導入 React Router。

### 7.2 狀態管理：Zustand

RoomState 由 socket 高頻推送，且房內元件樹會有多個元件各自訂閱 state 的不同片段
（玩家卡、板凳、倒數、交換彈窗等）。Zustand 的 selector 訂閱可以避免 Context 的
「value 變、全體 consumer re-render」問題，且能在 React 樹外直接 setState
（socket 事件 handler 內好用）。

---

## 8. 部署規劃

- 前端 `vite build` 出 `dist/`，由 Nginx 直接 serve 靜態檔
- 後端 Node 跑在內部 port（例如 3000），Nginx 反向代理 `/api` 與 `/socket.io`
- Postgres 跑 docker container
- HTTPS 用 Let's Encrypt + certbot
- 環境變數：`DATABASE_URL`、`JWT_SECRET`、`CLIENT_ORIGIN`

---

## 9. 亮點摘要（寫 README 用）

- TypeScript monorepo + 前後端共享型別，減少接口錯誤
- Server-authoritative 倒數計時與狀態機，防止前端篡改
- Socket.IO 處理斷線重連、grace period、房間生命週期
- Race condition 處理：英雄唯一性、交換申請的原子性
- 部署於自有 VPS（docker-compose / PM2）

---

## 10. 未來擴充（不在 MVP）

- 自建房 + 邀請碼（schema 已預留 `type`、`invite_code`）
- 房內聊天室
- 歷史記錄 / 個人戰績頁
- OAuth 登入
