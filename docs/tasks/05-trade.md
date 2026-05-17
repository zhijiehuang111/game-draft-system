# 模組 5：Trade

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §5
>
> 依賴：模組 4
>
> 1v1 交換申請、原子互換、同時申請數限制。

## 子任務

### 後端資料結構
- [ ] `apps/server/src/trade/types.ts`：`TradeRequest { id, fromUserId, toUserId, offerChampionId, wantChampionId, createdAt, expiresAt }`
- [ ] Room 內持有 `pendingTrade: TradeRequest | null`（單一房間最多一筆 pending；同時鎖住 from/to 雙方）
- [ ] 提供 `hasPendingTrade(userId)` 給 Draft Engine 查詢

### `trade:request` 處理
- [ ] 驗證：
  - [ ] phase === 'bench-trade'
  - [ ] fromUserId !== targetUserId
  - [ ] from 持有 offerChampionId
  - [ ] target 持有 wantChampionId
  - [ ] from 無 pending（不論發起 / 接收）→ `has-pending-trade`
  - [ ] target 無 pending → `target-busy`
- [ ] 通過：建立 `TradeRequest`（uuid id、expiresAt = now + 10_000）、設 pendingTrade、設超時 timer
- [ ] emit `trade:incoming` 給 target、`trade:pending` 給 from

### `trade:respond` 處理
- [ ] 驗證：tradeId 對應 pendingTrade、回應者是 toUserId
- [ ] accept=true：
  - [ ] re-check：from / to 仍持有 snapshot 的英雄（否則 resolved=false）
  - [ ] 原子互換 `from.currentChampion ↔ to.currentChampion`
  - [ ] emit `trade:resolved { tradeId, accepted: true }` 給雙方
  - [ ] 廣播 `room:state` 給全房
- [ ] accept=false：
  - [ ] emit `trade:resolved { tradeId, accepted: false }` 給雙方
- [ ] 清 timer、清 pendingTrade（解鎖）

### 超時處理
- [ ] `setTimeout(10_000)` → 等同收到 `trade:respond { accept: false }`
- [ ] 房間進入 lock-in / aborted 時清掉 pendingTrade 與 timer

### 前端
- [ ] `pendingTradeOutgoing` / `pendingTradeIncoming` 兩個 slice 欄位
- [ ] socket handler：
  - [ ] `trade:incoming` → 設 pendingTradeIncoming
  - [ ] `trade:pending` → 設 pendingTradeOutgoing
  - [ ] `trade:resolved` → 清對應欄位、跳 toast（成功 / 失敗）
- [ ] `PlayerCard`：右下交換 icon，點擊 → emit `trade:request { targetUserId, offer=自己當前, want=對方當前 }`
- [ ] `TradeModal`：訂閱 pendingTradeIncoming → 顯示「A 想用 X 跟你換 Y」+ 接受 / 拒絕 + 倒數 10s
- [ ] 在等待回應狀態下，UI 禁用自己再次發起 trade / 點板凳

### 驗證
- [ ] A 對 B 發起 → B 接受 → 英雄互換 + 全房畫面更新
- [ ] A 對 B 發起 → B 拒絕 → 雙方狀態解鎖
- [ ] A 對 B 發起 → 10s 不回應 → 自動視為拒絕
- [ ] A 對 B 發起後，C 對 B 發起 → C 收到 `target-busy`
- [ ] A 發起中，A 試圖點板凳 → 拒絕 `has-pending-trade`
