# 模組 5：Trade

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §5
>
> 依賴：模組 4
>
> 1v1 交換申請、原子互換、同時申請數限制。

## 子任務

### 後端資料結構
- [x] `apps/server/src/trade/types.ts`：`TradeRequest { id, fromUserId, toUserId, offerChampionId, wantChampionId, createdAt, expiresAt }`
- [x] Room 內持有 `pendingTrades: Map<tradeId, TradeRequest>`（一房可同時 >1 筆，例如 A↔B、C↔D 並存）
- [x] 鎖在 user 層級：每個 userId 最多涉入 1 筆 pending（不分發起 / 接收）；建議用 `lockedUsers: Map<userId, tradeId>` 反查
- [x] 提供 `hasPendingTrade(userId)` 給 Draft Engine 查詢

### `trade:request` 處理
- [x] 驗證：
  - [x] phase === 'bench-trade'
  - [x] fromUserId !== targetUserId
  - [x] from 持有 offerChampionId
  - [x] target 持有 wantChampionId
  - [x] from 無 pending（不論發起 / 接收）→ `has-pending-trade`
  - [x] target 無 pending → `target-busy`
- [x] 通過：建立 `TradeRequest`（uuid id、expiresAt = now + 10_000）、加入 `pendingTrades`、鎖住 from / to、設超時 timer
- [x] emit `trade:incoming` 給 target、`trade:pending` 給 from

### `trade:respond` 處理
- [x] 驗證：tradeId 對應某筆 pendingTrade、回應者是該筆的 toUserId
- [x] accept=true：
  - [x] re-check：from / to 仍持有 snapshot 的英雄（否則 resolved=false）
  - [x] 原子互換 `from.currentChampion ↔ to.currentChampion`
  - [x] emit `trade:resolved { tradeId, accepted: true }` 給雙方
  - [x] 廣播 `room:state` 給全房
- [x] accept=false：
  - [x] emit `trade:resolved { tradeId, accepted: false }` 給雙方
- [x] 清該筆 timer、從 `pendingTrades` 移除、解鎖該筆涉及的 from / to

### `trade:cancel` 處理（發起方主動取消）
- [x] 驗證：
  - [x] tradeId 對應某筆 pendingTrade
  - [x] 呼叫者是該筆的 `fromUserId`（只有發起方能取消；接收方要拒絕請走 `trade:respond { accept: false }`）
  - [x] phase === 'bench-trade'（lock-in / aborted 時的清理由階段轉換負責，不接受手動 cancel）
- [x] 通過：
  - [x] emit `trade:resolved { tradeId, accepted: false, reason: 'cancelled' }` 給雙方
  - [x] 清該筆 timer、從 `pendingTrades` 移除、解鎖 from / to
- [x] 失敗回 `error { code: 'no-pending-trade' | 'not-trade-owner' }`

### 超時處理
- [x] 每筆獨立 `setTimeout(10_000)` → 等同收到 `trade:respond { accept: false }`（reason: 'timeout'）
- [x] 房間進入 lock-in / aborted 時清掉所有 pendingTrades 與 timers

### 前端
- [x] `pendingTradeOutgoing` / `pendingTradeIncoming` 兩個 slice 欄位
- [x] socket handler：
  - [x] `trade:incoming` → 設 pendingTradeIncoming
  - [x] `trade:pending` → 設 pendingTradeOutgoing
  - [x] `trade:resolved` → 清對應欄位、跳 toast（成功 / 失敗 / 已取消）
- [x] `PlayerCard`：右下交換 icon，點擊 → emit `trade:request { targetUserId, offer=自己當前, want=對方當前 }`
- [x] `TradeModal`：訂閱 pendingTradeIncoming → 顯示「A 想用 X 跟你換 Y」+ 接受 / 拒絕 + 倒數 10s
- [x] 發起方等待回應 UI（基於 pendingTradeOutgoing）：顯示「等待對方回應…」+ 倒數 10s + **取消按鈕** → emit `trade:cancel { tradeId }`
- [x] 在等待回應狀態下，UI 禁用自己再次發起 trade / 點板凳（取消按鈕除外）

### 驗證
- [x] A 對 B 發起 → B 接受 → 英雄互換 + 全房畫面更新
- [x] A 對 B 發起 → B 拒絕 → 雙方狀態解鎖
- [x] A 對 B 發起 → 10s 不回應 → 自動視為拒絕
- [x] A 對 B 發起 → A 主動 `trade:cancel` → 雙方收到 `trade:resolved { accepted: false, reason: 'cancelled' }`、狀態解鎖
- [x] B（接收方）試圖 `trade:cancel` → 拒絕 `not-trade-owner`
- [x] A 對 B 發起後，C 對 B 發起 → C 收到 `target-busy`
- [x] A 發起中，A 試圖點板凳 → 拒絕 `has-pending-trade`
- [x] A 取消後立即重新發起 → 成功（解鎖正確）
- [x] A↔B 與 C↔D 同時 pending → 兩筆獨立並存、互不影響、各自解析
