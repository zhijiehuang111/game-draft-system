import { credentialsSchema } from "@app/shared";
import { Router } from "express";
import { DatabaseError } from "pg";
import { pool } from "../db/pool.js";
import {
  createUser,
  findById,
  findByUsername,
} from "../db/repositories/users.repo.js";
import { clearAuthCookie, setAuthCookie } from "./cookies.js";
import { signToken } from "./jwt.js";
import { requireAuth } from "./middleware.js";
import { comparePassword, hashPassword } from "./password.js";

const PG_UNIQUE_VIOLATION = "23505";

export const authRouter: Router = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "invalid-body", message: "Invalid credentials format" },
    });
    return;
  }
  const { username, password } = parsed.data;

  const existing = await findByUsername(pool, username);
  if (existing) {
    res.status(409).json({
      error: { code: "username-taken", message: "Username already taken" },
    });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await createUser(pool, username, passwordHash);
    const token = signToken({ sub: user.id });
    setAuthCookie(res, token);
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    if (err instanceof DatabaseError && err.code === PG_UNIQUE_VIOLATION) {
      res.status(409).json({
        error: { code: "username-taken", message: "Username already taken" },
      });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({
      error: {
        code: "invalid-credentials",
        message: "Invalid username or password",
      },
    });
    return;
  }
  const { username, password } = parsed.data;

  const user = await findByUsername(pool, username);
  if (!user) {
    res.status(401).json({
      error: {
        code: "invalid-credentials",
        message: "Invalid username or password",
      },
    });
    return;
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({
      error: {
        code: "invalid-credentials",
        message: "Invalid username or password",
      },
    });
    return;
  }

  const token = signToken({ sub: user.id });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, username: user.username } });
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findById(pool, req.userId!);
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({
      error: { code: "unauthorized", message: "User no longer exists" },
    });
    return;
  }
  res.json({ user: { id: user.id, username: user.username } });
});
