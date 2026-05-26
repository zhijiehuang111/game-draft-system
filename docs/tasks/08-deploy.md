# 模組 8：部署到 VPS

> VPS 已完成基礎設定（user / SSH / ufw / fail2ban / fnm / pnpm / Docker / PM2 / Nginx / Cloudflare DNS / Let's Encrypt）。
> 本模組只列 **game-draft-system 特有** 的步驟，共用基礎設施不重複。

---

## A. 本機 code 改動（push 前做完）

- [x] **A1. server bind loopback**
  - `apps/server/src/index.ts`：`httpServer.listen(port, '127.0.0.1', ...)`
  - 跟 playground 同理，只讓 Nginx reverse proxy 進來

- [x] **A2. 建立 `ecosystem.config.cjs`**
  - root 是 `"type": "module"`，PM2 config 必須 `.cjs`
  - `interpreter: process.execPath` 避免 fnm multishell reboot 雷
  - `script: "./apps/server/dist/index.js"`（注意是 `server` 不是 `api`）
  - `node_args: "--env-file=.env"`

- [x] **A3. 確認 `shared` package 被 server build 正確解析**
  - `packages/shared` 是 source-level export（`"main": "./src/index.ts"`），沒有 build step
  - server 的 `tsc` 用 `NodeNext` resolution，會直接解析到 `.ts`
  - 驗證：本機跑 `pnpm build` → `ls apps/server/dist/` 確認產出正常
  - 可能需要在 server `tsconfig.json` 加 `references` 或確認 `paths` mapping

- [x] **A4. push 到 GitHub**

---

## B. VPS 上拉 code 與安裝

- [x] **B1. pull 最新 code**
  ```bash
  cd ~/game-draft-system   # 或你選的目錄名
  git pull
  ```
  如果是第一次 clone：
  ```bash
  git clone https://github.com/<user>/game-draft-system.git
  cd game-draft-system
  ```

- [x] **B2. 安裝依賴**
  ```bash
  pnpm install
  ```

---

## C. 環境變數

- [x] **C1. 建立 `.env`，改掉不安全的預設值**
  ```bash
  cp .env.example .env
  chmod 600 .env
  nano .env
  ```
  需要改的欄位：
  - `POSTGRES_PASSWORD` → 強密碼（`openssl rand -base64 32`）
  - `JWT_SECRET` → 64-byte random（`openssl rand -base64 64`）
  - `DATABASE_URL` 的密碼跟 `POSTGRES_PASSWORD` 對齊
  - `NODE_ENV=production`
  - `PORT=3000`（或你想用的 port）

---

## D. Docker + Migration

- [x] **D1. 啟動 Postgres**
  ```bash
  docker compose up -d
  docker compose ps   # 確認 running
  ```

- [x] **D2. 跑 migration**
  ```bash
  set -a; source .env; set +a
  docker compose exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    < apps/server/migrations/001_init.sql
  ```
  驗證：
  ```bash
  docker compose exec postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
  ```
  應看到 `users` / `draft_results`。

---

## E. Build

- [x] **E1. build 全部 workspace**
  ```bash
  pnpm build
  ```
  驗證：
  ```bash
  ls apps/server/dist/index.js      # 存在
  ls apps/client/dist/index.html    # 存在
  ```

---

## F. PM2 啟動 server

- [x] **F1. 啟動**
  ```bash
  pm2 start ecosystem.config.cjs
  ```
  驗證：
  ```bash
  pm2 ls                               # status = online, memory > 0
  pm2 logs server --lines 10 --nostream
  curl http://127.0.0.1:3000/health    # {"ok":true}
  ```

- [x] **F2. save + startup**
  ```bash
  pm2 save
  # 如果之前沒跑過 pm2 startup（已跑過就跳過）：
  pm2 startup   # 複製印出的 sudo 指令貼上執行
  pm2 save
  ```

---

## G. Nginx 設定

- [x] **G1. 寫 site config**

  跟 playground 的差異：
  1. 路徑從 `apps/web/dist` → `apps/client/dist`
  2. 多一段 **WebSocket proxy**（`/socket.io/`）
  3. `/api/` proxy 一樣帶結尾 `/`（strip prefix），因為 server 路由不帶 `/api`

  `/etc/nginx/sites-available/game-draft`：
  ```nginx
  server {
      listen 80;
      listen [::]:80;
      server_name your-domain.com;

      root /home/<username>/game-draft-system/apps/client/dist;
      index index.html;

      # SPA fallback
      location / {
          try_files $uri $uri/ /index.html;
      }

      # API reverse proxy（strip /api/ prefix）
      location /api/ {
          proxy_pass http://127.0.0.1:3000/;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }

      # Socket.IO — WebSocket + long-polling
      location /socket.io/ {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }

      # Vite hashed assets — long cache
      location /assets/ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }
  }
  ```

  **`/socket.io/` 的 `proxy_pass` 不帶結尾 `/`**：
  Socket.IO client 發的請求是 `/socket.io/?EIO=4&transport=polling` 等，
  server 端 Socket.IO 也期望收到 `/socket.io/...` 路徑，所以要**原樣轉發**，不能 strip prefix。

  **WebSocket 三行必帶**：
  - `proxy_http_version 1.1` — WebSocket 是 HTTP/1.1 Upgrade，Nginx 預設 1.0 不行
  - `Upgrade $http_upgrade` — 把 client 的 `Upgrade: websocket` header 轉給後端
  - `Connection "upgrade"` — 告訴後端這是 upgrade 請求

- [x] **G2. 啟用 + reload**
  ```bash
  sudo ln -s /etc/nginx/sites-available/game-draft /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

- [x] **G3. certbot HTTPS**
  ```bash
  sudo certbot --nginx
  ```
  如果 domain 跟 playground 不同，certbot 會自動處理新 cert。

---

## H. 驗證

- [x] **H1. HTTP → HTTPS redirect**
  ```bash
  curl -I http://your-domain.com/       # 301 → https
  ```

- [x] **H2. 靜態頁面**
  ```bash
  curl -I https://your-domain.com/      # 200, text/html
  ```

- [x] **H3. API**
  ```bash
  curl https://your-domain.com/api/health   # {"ok":true}
  ```

- [x] **H4. WebSocket**
  - 瀏覽器打開 → 登入 → 加入佇列 → 確認 socket 連線建立（DevTools → Network → WS tab）

- [x] **H5. Reboot 驗收**
  ```bash
  sudo reboot
  # 等 30 秒 ssh 回來
  docker compose ps          # postgres Up
  pm2 ls                     # server online, memory > 0
  ss -tlnp | grep 3000      # LISTEN
  ```

---

## I. 後續可選

- [x] Cloudflare 橘雲（CDN + DDoS 保護）
- [ ] 部署腳本（`scripts/deploy.sh`：git pull + pnpm install + build + pm2 reload）
- [ ] GitHub Actions CI/CD
