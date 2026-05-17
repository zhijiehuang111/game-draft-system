# 模組 7：Frontend Shell

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §7
>
> 依賴：模組 0
>
> 全域畫面切換（無路由）、Zustand store、Champion 常數載入、Socket 生命週期。

## 子任務

### 條件渲染外殼
- [ ] `apps/client/src/App.tsx`：依 store 判斷渲染 AuthScreen / LobbyScreen / RoomScreen / ResultScreen
- [ ] `room.phase === 'aborted'` → toast + 清 room → 回 Lobby（單獨處理）
- [ ] 全域 toast 元件（簡易）：`useToast` hook 或第三方輕量套件

### Zustand store（slice pattern）
- [ ] `apps/client/src/stores/index.ts`：`useAppStore = create<AppStore>()(...)`
- [ ] `stores/authSlice.ts`：`user`、`setUser`、`logout`（同時清 lobby / room）
- [ ] `stores/championsSlice.ts`：`champions: Record<id, Champion>`、`setChampions(list)`
- [ ] `stores/lobbySlice.ts`：`queueSize`、`inQueue`、`setQueue`
- [ ] `stores/roomSlice.ts`：`currentRoom`、`pendingTradeIncoming`、`pendingTradeOutgoing`、`setRoomState`、`applyPhaseChange`
- [ ] `stores/socketSlice.ts`：`socket`、`connect`、`disconnect`
- [ ] 每個 slice 用 `StateCreator<AppStore, [], [], XxxSlice>` 型別
- [ ] 用 selector 訂閱範例：`useAppStore(s => s.currentRoom?.bench)`

### Socket 生命週期
- [ ] `apps/client/src/socket/setup.ts`：在 `connect()` 內建立 socket、註冊所有 server-push handler（room:state / room:phase / queue:update / trade:* / player:* / room:aborted / error）
- [ ] 所有 handler 直接呼叫 `useAppStore.setState(...)`，不透過 React
- [ ] App mount 流程：
  - [ ] fetch `/api/auth/me` → 200 → setUser → connect socket → fetch `/api/champions` → setChampions
  - [ ] 401 → 顯示 AuthScreen
- [ ] AuthScreen 成功登入後執行同上 connect 流程

### 時鐘校正
- [ ] 收到 `room:state` 或 `room:phase` 時：`offset = serverNow - Date.now()` 寫入 store
- [ ] `Countdown` 元件用 `phaseEndsAt - (Date.now() + offset)` 計算剩餘

### Champion 載入
- [ ] `api/champions.ts`：fetch + 回傳 `Champion[]`
- [ ] App boot 時呼叫並寫入 store；後續不重抓
- [ ] `ChampionAvatar` 共用元件：給 championId、render 圖片 + 名稱

### 共用樣式
- [ ] Tailwind 全域樣式（暗色背景、卡片基礎樣式）
- [ ] 共用 Button、Card、Modal 元件（最小限度）

### 驗證
- [ ] 重整頁面後仍維持登入、自動連 socket、自動取 champions
- [ ] 在 RoomScreen 訂閱單一欄位的元件不會因為其他欄位變動 re-render（React DevTools profiler 確認）
- [ ] 離開房間（aborted / done 後操作）狀態正確清空
