# 模組 0：專案骨架 / Monorepo Setup

> 上游：[`docs/proposal.md`](../proposal.md) §2、[`docs/detailed-design.md`](../detailed-design.md) 附錄 C/D
>
> 這是所有模組的前置依賴，必須最先完成。

## 子任務

- [ ] 初始化 pnpm workspaces，建立 `pnpm-workspace.yaml`
- [ ] 建立目錄結構 `packages/{shared,server,client}` 各自 `package.json`
- [ ] 根 `package.json` 設定共用 scripts（`dev`、`build`、`lint`、`typecheck`）
- [ ] 設定根 `tsconfig.base.json`，三個 package 各自 `tsconfig.json` extends
- [ ] `packages/shared`：純 TS 套件，輸出 type-only（`SocketEvent`、`RoomState`、`Champion` 預留 export）
- [ ] `packages/server`：安裝 `express`、`socket.io`、`pg`、`bcrypt`、`jsonwebtoken`、`cookie-parser`、`zod`、`tsx`
- [ ] `packages/client`：`pnpm create vite` 建立 React + TS，安裝 `socket.io-client`、`zustand`、`tailwindcss`
- [ ] Tailwind 初始化（`tailwind.config.js`、`postcss.config.js`、入口 CSS `@tailwind` 指令）
- [ ] 設定 `.env.example`（`DATABASE_URL`、`JWT_SECRET`、`NODE_ENV`、`PORT`）
- [ ] `vite.config.ts` 配置 `/api` 與 `/socket.io`（含 `ws: true`）proxy 到後端
- [ ] 設定 ESLint + Prettier（共用 config，monorepo 一致）
- [ ] 加入 `.gitignore`（node_modules、dist、.env、.DS_Store）
- [ ] 根 README 寫上「pnpm install → pnpm dev」基本指引
- [ ] 驗證：`pnpm -r typecheck` 全部過、`pnpm dev` 可同時起前後端
