import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "./cookies.js";
import { verifyToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    res
      .status(401)
      .json({ error: { code: "unauthorized", message: "Not authenticated" } });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res
      .status(401)
      .json({ error: { code: "unauthorized", message: "Invalid token" } });
    return;
  }
  req.userId = payload.sub;
  next();
}
