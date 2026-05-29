import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not set");
}
const JWT_SECRET: string = secret;

const EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ sub: payload.sub }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.sub !== "string")
      return null;
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}
