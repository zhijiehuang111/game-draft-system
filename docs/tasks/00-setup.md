# 模組 0：專案骨架 / Monorepo Setup

> 上游：[`docs/proposal.md`](../proposal.md) §2、[`docs/detailed-design.md`](../detailed-design.md) 附錄 C/D
>
> 這是所有模組的前置依賴，必須最先完成。

## 目錄結構

```
game-draft-system/
├── apps/
│   ├── server/      # Express + Socket.IO
│   └── client/      # Vite + React
├── packages/
│   └── shared/      # 共用型別
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

- `apps/`：可獨立啟動 / 部署的應用
- `packages/`：被 apps 引用的 library（型別、未來的 config 套件等）

## 子任務

- [x] 初始化 pnpm workspaces，`pnpm-workspace.yaml` 加入 `apps/*` 與 `packages/*`
- [x] 建立目錄與 `package.json`：`apps/server`、`apps/client`、`packages/shared`
- [x] 根 `package.json` 設定共用 scripts（`dev`、`build`、`typecheck`）
- [x] `packages/shared`：純 TS 套件，輸出 type-only（`SocketEvent`、`RoomState`、`Champion` 預留 export）
- [x] `apps/server`：安裝 `express`、`socket.io`、`pg`、`bcrypt`、`jsonwebtoken`、`cookie-parser`、`zod`、`tsx`
- [x] `apps/client`：`pnpm create vite` 建立 React + TS，安裝 `socket.io-client`、`zustand`、`tailwindcss`（v4）、`@tailwindcss/vite`
- [x] Tailwind v4 初始化：`vite.config.ts` 註冊 `@tailwindcss/vite` plugin、入口 CSS 加 `@import "tailwindcss";`（v4 走 CSS-first，不需 `tailwind.config.js` / `postcss.config.js`；如需自訂 token 用 `@theme {}`）
- [x] `vite.config.ts` 配置 `/api` 與 `/socket.io`（含 `ws: true`）proxy 到後端
- [x] 加入 `.gitignore`（node_modules、dist、.env、.DS_Store）
