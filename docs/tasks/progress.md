# 總體進度

> 上游：[`docs/proposal.md`](../proposal.md)、[`docs/detailed-design.md`](../detailed-design.md)
>
> 每個模組對應 `docs/tasks/<module>.md`；模組內所有子任務勾完才能勾掉本頁項目。

## 模組

- [x] [模組 0：專案骨架](./00-setup.md) — pnpm workspaces / TS / Vite / Tailwind / proxy
- [x] [模組 1：Data Layer](./01-data-layer.md) — Postgres schema / migration / shared 型別 / repo
- [x] [模組 2：Auth](./02-auth.md) — 註冊 / 登入 / JWT cookie / socket 握手
- [x] [模組 3：Matchmaking](./03-matchmaking.md) — 全域佇列 / 湊滿建房 / Lobby UI
- [x] [模組 4：Draft Engine](./04-draft-engine.md) — 狀態機 / 倒數 / 分配 / pick / 結算
- [ ] [模組 5：Trade](./05-trade.md) — 1v1 交換 / 原子互換 / 限制（**未開始**）
- [ ] [模組 6：Realtime / Reconnect](./06-realtime-reconnect.md) — socket registry / 15s grace / 作廢（**進行中**：Socket.IO 基礎 / Registry / 錯誤事件已完成；`room:join`、斷線 grace、主動離房、前端 reconnect handler、驗證皆待補）
- [ ] [模組 7：Frontend Shell](./07-frontend-shell.md) — 條件渲染 / Zustand slice / 時鐘校正（**進行中**：外殼 / store / socket 生命週期 / Champion 載入皆完成；時鐘校正、aborted 流程、Modal 元件、整體手動驗證待模組 5、6 接上）

## 建議執行順序

1. **模組 0**（必須最先）
2. **模組 1**（DB schema 是後續多模組前置）
3. **模組 2** + **模組 7（骨架部分）** 並行：先有登入 + 條件渲染外殼
4. **模組 6**（Realtime 基礎）→ 模組 3（Matchmaking 需 socket）
5. **模組 4 Draft Engine**（核心）
6. **模組 5 Trade**（在 Draft Engine 之上）
7. **模組 7 餘下細節**（UI 收尾、樣式、體感）

## 端到端驗收

- [ ] 4 人從註冊 → 加入佇列 → 完整跑完一局 → 看到結果頁
- [ ] 中途有人斷線 15s → 房間作廢、其餘人回 Lobby
- [ ] 中途有人斷線 5s 後重連 → 房間繼續、狀態同步
- [ ] 交換流程 accept / reject / timeout 三條路徑皆驗過
- [ ] 部署到 VPS（nginx + pm2 / docker-compose）、HTTPS、可公開連線
