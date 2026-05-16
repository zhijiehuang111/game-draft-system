# Vibe Coding 啟動 Prompt — LoL 風格選角系統

> 本文件是 **無人工介入** 的自動化開發起始 Prompt，貼進 Claude Code（主 Agent 會話）即可啟動。
>
> 上游文件：
> - 需求：[`docs/proposal.md`](./proposal.md)
> - 詳細設計：[`docs/detailed-design.md`](./detailed-design.md)
> - 任務劃分：[`docs/tasks/`](./tasks/)（00-setup ~ 07-frontend-shell，總入口 [`progress.md`](./tasks/progress.md)）

---

## 0. 給主 Agent 的指令（START HERE）

你是本專案的 **主 Agent**，負責端到端把 LoL 風格選角系統從零實作到本地可跑通，全程不會有人類介入。

### 0.1 你的職責

1. **理解上下文**：開工前完整閱讀 `docs/proposal.md`、`docs/detailed-design.md`、`docs/tasks/progress.md` 與 7 份模組任務文件。
2. **規劃**：用 `TaskCreate` 把 8 個模組（00 ~ 07）建成 task list，依 `progress.md` §「建議執行順序」依序推進。
3. **派發**：每個模組 spawn 一個 **子 Agent**（`Agent` 工具，`subagent_type: "general-purpose"`，`isolation: "worktree"`），讓子 Agent 在獨立 worktree 內完成該模組所有子任務與測試。
4. **驗收與合併**：子 Agent 回傳後，你要：
   - 拉取子 Agent 的 worktree 路徑與 branch。
   - 切到該 branch、跑 `pnpm -r typecheck` 與 `pnpm -r test`（如已存在），確認綠燈。
   - merge 進 `main`（fast-forward 優先），刪除 worktree。
   - 更新 `docs/tasks/progress.md` 與該模組的 `0X-*.md` 子任務 checkbox。
   - 用 `TaskUpdate` 標該模組為 completed。
5. **失敗處理**：若子 Agent 回報失敗、typecheck 紅燈、或測試紅燈：
   - 不直接修；改用 `Agent` 再開一個子 Agent（同模組），把錯誤訊息與上一輪輸出當 context 餵給它，請它修。
   - 同一模組最多重試 3 次，第 4 次仍失敗則停下、寫 `docs/tasks/BLOCKED.md` 記錄狀況、結束會話。
6. **推進**：所有模組通過後，跑端到端驗收（見 §5），全綠則任務完成。

### 0.2 你 **不該** 做的事

- 不要自己跳下去寫業務代碼。實作工作一律交給子 Agent。例外：merge 衝突、修 `progress.md`、修 commit message 這類 orchestration 工作可以自己動手。
- 不要跳過模組順序（如 `progress.md` 沒列為可並行的模組）。
- 不要省略測試。每個模組合併前必須 typecheck 與單元測試雙綠。
- 不要 push 到 remote、不要建 PR、不要做 VPS 部署。本輪範疇是 **本地跑通端到端**。
- 不要修改 `docs/proposal.md` 或 `docs/detailed-design.md`。若實作中發現設計矛盾，記錄在 `docs/tasks/DESIGN-NOTES.md` 後繼續。

---

## 1. 全域約束（主 Agent 與所有子 Agent 都要遵守）

| 項目 | 規則 |
| --- | --- |
| 語言 | 全程 TypeScript（前後端共享型別走 `packages/shared`） |
| 包管理 | pnpm workspaces；新依賴一律 `pnpm add -F <pkg> <dep>` |
| 測試 | **單元測試 + 型別檢查**。框架用 Vitest（client + server + shared 共用）。E2E / 手動驗證 **不在範疇** |
| 程式品質 | 每模組合併前：`pnpm -r typecheck` 過、`pnpm -r test` 過、`pnpm -r lint` 過 |
| Champion 資料 | **20+ 隻虛構英雄**（id 如 `champ-01` ~ `champ-24`，名字隨意編，例：`Aelora`、`Brakthorn`），imageUrl 用 `https://placehold.co/128x128/<color>/white?text=<id>` 之類的 placeholder。**不使用任何真實 LoL 名稱或圖像**（避免版權） |
| Git | main 直接 commit；每模組合併出 **一個** squash commit；commit message 格式：`feat(module-NN): <短描述>`（NN = 00~07） |
| 進度可見性 | 每完成一個模組要更新 `docs/tasks/progress.md` 的對應 checkbox 與 `0X-*.md` 內所有子任務 checkbox |

---

## 2. 子 Agent 派發協議

### 2.1 派發方式

主 Agent 用 `Agent` 工具，**每模組一個子 Agent**：

```
Agent({
  description: "Module NN: <name>",
  subagent_type: "general-purpose",
  isolation: "worktree",       // ← 必填，跑在獨立 worktree
  prompt: <見 §2.2 模板>
})
```

子 Agent 完工後會回傳：worktree 路徑、branch 名、簡要工作摘要。主 Agent 接著做 §0.1 步驟 4。

### 2.2 子 Agent Prompt 模板

每次派發時，把下面這段填好後當成 `prompt` 餵給子 Agent：

```
你是模組 {NN}（{name}）的實作 Agent。

## 你的範疇
完整閱讀並實作 docs/tasks/{NN}-{slug}.md 內所有子任務。對應的設計章節在 docs/detailed-design.md §{section}。
需求背景在 docs/proposal.md。前置模組（已合併進 main）：{依賴清單}。

## 全域約束（必讀）
詳見 docs/prompt.md §1。重點：
- TypeScript + pnpm workspaces
- 測試框架：Vitest；只做單元測試 + typecheck，不做 E2E
- Champion 資料：虛構名 + placehold.co 圖（不用真實 LoL）
- 程式品質門檻：`pnpm -r typecheck`、`pnpm -r test`、`pnpm -r lint` 全綠

## 工作流程
1. 在當前 worktree 內讀完上述文件，確認自己理解。
2. 實作 docs/tasks/{NN}-*.md 列出的所有子任務。
3. 為本模組關鍵邏輯寫 Vitest 單元測試（放在同檔案旁的 `*.test.ts`）。本模組任務文件「驗證」段落內的項目，能轉成單元測試的全部轉。
4. 跑 `pnpm -r typecheck`、`pnpm -r test`、`pnpm -r lint` 全綠。
5. 把該模組的 `0X-*.md` 內所有完成的子任務 checkbox 從 `[ ]` 改成 `[x]`。
6. 把 `docs/tasks/progress.md` 內本模組那一行勾起來。
7. git commit 一個 squash commit，訊息：`feat(module-{NN}): <一句總結>`。
8. 回傳給主 Agent：worktree 路徑、branch 名、實作摘要（< 200 字）、測試覆蓋的關鍵情境清單。

## 不該做
- 不要動其他模組的代碼（除非任務文件明說要動 shared 型別）
- 不要做 E2E、不要寫 Playwright、不要嘗試實際啟動瀏覽器
- 不要 push、不要建 PR
- 不要修改 docs/proposal.md 或 docs/detailed-design.md
- 如果碰到設計矛盾或無法解決的問題，append 到 docs/tasks/DESIGN-NOTES.md，**不要**自己改設計文件
```

派發時把 `{NN}`、`{name}`、`{slug}`、`{section}`、`{依賴清單}` 替換掉。對應表見 §3。

---

## 3. 模組執行順序與派發參數

依 `docs/tasks/progress.md` §「建議執行順序」。本輪簡化為 **嚴格順序** 執行（不並行），降低 worktree 合併複雜度。

| 順序 | NN | name | slug | design § | 依賴（已合併） |
| --- | --- | --- | --- | --- | --- |
| 1 | 00 | Setup | `setup` | 附錄 C/D | 無 |
| 2 | 01 | Data Layer | `data-layer` | §1 | 00 |
| 3 | 02 | Auth | `auth` | §2 | 00, 01 |
| 4 | 07 | Frontend Shell（骨架部分） | `frontend-shell` | §7 | 00 |
| 5 | 06 | Realtime / Reconnect | `realtime-reconnect` | §6 | 00, 02 |
| 6 | 03 | Matchmaking | `matchmaking` | §3 | 00, 01, 02, 06 |
| 7 | 04 | Draft Engine | `draft-engine` | §4 | 00, 01, 02, 03, 06, 07 |
| 8 | 05 | Trade | `trade` | §5 | 04 |

> 注意：第 4 步「Frontend Shell」先派發 **骨架部分**（條件渲染外殼、store slice 雛形、socket 生命週期、Champion 載入）；其餘 UI 細節（RoomScreen / TradeModal / 樣式收尾）併在模組 04 / 05 子 Agent 內完成。子 Agent 看 `07-frontend-shell.md` 自行判斷哪些屬於骨架。

---

## 4. 主 Agent 每輪迴的標準動作

對每個模組，主 Agent 跑這個迴圈：

```
loop:
  1. TaskUpdate(module-NN, in_progress)
  2. spawn 子 Agent（依 §2.1 / §2.2）
  3. 等子 Agent 回傳
  4. cd <worktree> && pnpm install（如有新依賴）
  5. pnpm -r typecheck && pnpm -r test && pnpm -r lint
     - 失敗 → 紀錄 stderr → goto retry
  6. merge worktree branch 進 main：
     git merge --ff-only <branch> || git merge --squash <branch> && git commit
  7. 刪除 worktree：git worktree remove <path>
  8. 確認 progress.md 與 0X-*.md checkbox 已勾（若子 Agent 漏勾，主 Agent 補勾並 amend 或新增 commit）
  9. TaskUpdate(module-NN, completed)

retry:
  - 失敗次數 < 3：spawn 新子 Agent，prompt 多附「上一輪失敗原因 + 錯誤訊息」
  - 失敗次數 >= 3：寫 BLOCKED.md、TaskUpdate(blocked)、終止流程
```

---

## 5. 端到端驗收（所有模組完成後，主 Agent 自己跑）

由於沒有 E2E 測試，本輪「端到端驗收」採 **代碼級綜合檢查**：

1. **全綠**：`pnpm -r typecheck`、`pnpm -r test`、`pnpm -r lint` 在 main HEAD 全綠。
2. **啟動冒煙**：
   - `docker compose up -d postgres` → 等健康。
   - `pnpm --filter server migrate:up` 成功。
   - `pnpm dev` 同時起前後端，**無 crash log**（背景跑 30 秒後 kill）。
3. **API 冒煙**（用 curl 對本地 server）：
   - `POST /api/auth/register` → 200 + Set-Cookie。
   - 帶 cookie `GET /api/auth/me` → 200。
   - `GET /api/champions` → 200，回 20+ 隻虛構英雄。
4. **產出總結**：寫 `docs/tasks/COMPLETED.md`，內容包含：
   - 各模組 commit hash 與一句摘要。
   - 任何遺留的 `DESIGN-NOTES.md` 或 `BLOCKED.md` 條目。
   - 本地啟動指令清單（`pnpm install` → `docker compose up -d` → `pnpm migrate:up` → `pnpm dev`）。
5. 在 main 加最後一個 commit：`chore: complete vibe-coding run`。

完成上述後，主 Agent 任務結束。

---

## 6. 一致性檢查清單（主 Agent 在每次合併前 mental check）

- [ ] commit message 是 `feat(module-NN): ...`
- [ ] `docs/tasks/progress.md` 對應模組勾起來
- [ ] `docs/tasks/0N-*.md` 內所有完成的子任務勾起來
- [ ] typecheck / test / lint 全綠
- [ ] worktree 已刪除
- [ ] 無多餘 untracked 檔案

---

## 7. 失控時的 kill-switch

若同一模組重試 3 次仍失敗、或檢測到下列狀況，立刻停下並寫 `docs/tasks/BLOCKED.md`：

- 子 Agent 嘗試動 `docs/proposal.md` / `docs/detailed-design.md`。
- 子 Agent 嘗試 push 或建 PR。
- 子 Agent 嘗試引入真實 LoL 圖像 / 名稱。
- 出現超過 100 行 diff 但與當前模組無關的改動。
- 任何測試需要外部網路 / 真實服務（除了本地 Postgres docker）。

`BLOCKED.md` 內容：模組編號、嘗試次數、最後一次錯誤輸出、建議的人工修復方向。

---

## 8. 啟動指令

主 Agent 讀完本文件後，立即執行：

1. `TaskCreate`：把 8 個模組建成 task list。
2. `TaskUpdate(module-00, in_progress)`。
3. 派發模組 00 的子 Agent（見 §2.2 模板）。
4. 進入 §4 的迴圈。

開始。
