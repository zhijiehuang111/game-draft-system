import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signToken, verifyToken } from "./jwt.js";

const SECRET = process.env.JWT_SECRET!;

afterEach(() => {
  vi.useRealTimers();
});

describe("signToken / verifyToken", () => {
  it("round-trips the sub claim", () => {
    const token = signToken({ sub: "user-123" });
    expect(verifyToken(token)).toEqual({ sub: "user-123" });
  });

  it("produces a token that other secrets cannot verify", () => {
    const token = signToken({ sub: "user-123" });
    expect(() => jwt.verify(token, "another-secret")).toThrow();
  });

  it("returns null for a token signed with a different secret", () => {
    const forged = jwt.sign({ sub: "user-123" }, "wrong-secret");
    expect(verifyToken(forged)).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });

  it("returns null once the token has expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const token = signToken({ sub: "user-123" });

    expect(verifyToken(token)).toEqual({ sub: "user-123" });

    vi.setSystemTime(new Date("2020-01-09T00:00:00Z"));
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null when sub is missing", () => {
    const token = jwt.sign({ foo: "bar" }, SECRET);
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null when sub is not a string", () => {
    const token = jwt.sign({ sub: 42 }, SECRET);
    expect(verifyToken(token)).toBeNull();
  });

  it("rejects tokens signed with a different algorithm", () => {
    const token = jwt.sign({ sub: "user-123" }, "", { algorithm: "none" });
    expect(verifyToken(token)).toBeNull();
  });
});
