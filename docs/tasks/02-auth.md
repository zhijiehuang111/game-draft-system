# 模組 2：Auth

> 上游：[`docs/detailed-design.md`](../detailed-design.md) §2
>
> 依賴：模組 0、1
>
> 註冊 / 登入 / `/me` / 登出；JWT + httpOnly cookie；REST middleware + Socket.IO 握手。

## 子任務

### 後端核心

- [x] `apps/server/src/auth/password.ts`：bcrypt cost=12 的 hash / compare
- [x] `apps/server/src/auth/jwt.ts`：`signToken({sub})` / `verifyToken(token)`；HS256、exp 7d
- [x] `apps/server/src/auth/cookies.ts`：set/clear cookie 工具（httpOnly、sameSite=Lax、secure 在 prod、path=/、maxAge=7d）
- [x] `apps/server/src/auth/middleware.ts`：`requireAuth`，解析 cookie → 驗 JWT → 注入 `req.userId`，失敗 401

### REST 路由

- [x] `POST /api/auth/register`：zod 驗 body（username 規則、password 長度）、查重、建 user、簽 JWT、設 cookie、回 `{ user }`
  - [x] 處理 username 衝突 → 409 `{ error: { code: 'username-taken' } }`
- [x] `POST /api/auth/login`：查 user、bcrypt compare、簽 JWT、設 cookie、回 `{ user }`
  - [x] 失敗 → 401 `{ error: { code: 'invalid-credentials' } }`
- [x] `POST /api/auth/logout`：clearCookie、回 `{ ok: true }`
- [x] `GET /api/auth/me`：套用 `requireAuth`、回 `{ user }`；未登入 401
- [x] 統一錯誤格式 `{ error: { code, message } }`

### Socket.IO 握手

- [x] `io.use(authMiddleware)`：parse cookie → verify JWT → `socket.data.userId = userId`，失敗 `next(new Error('unauthorized'))`
- [x] cookie 解析共用工具（server 端）

### 前端

- [x] `apps/client/src/screens/AuthScreen.tsx`：register / login 表單切換、submit 後呼叫對應 API
- [x] `apps/client/src/api/auth.ts`：`register`、`login`、`logout`、`getMe`（fetch，無需手動帶 token）
- [x] App 啟動時呼叫 `getMe`：200 → store.setUser；401 → 顯示 AuthScreen
- [x] AuthScreen 表單驗證（前端 zod 同步規則）、錯誤訊息顯示

### 驗證

- [ ] 註冊 → 自動登入 → 重整後 `me` 仍可取得 user
- [ ] 登出後 cookie 清空、再呼叫 `me` 回 401
- [ ] Socket 連線在未登入時被拒
