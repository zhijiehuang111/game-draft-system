import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "./password.js";

describe("hashPassword / comparePassword", () => {
  it("hashes to something other than the plaintext", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).not.toBe("correct horse");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await comparePassword("correct horse", hash)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse");
    expect(await comparePassword("wrong horse", hash)).toBe(false);
  });

  it("is salted: same password hashes differently but both verify", async () => {
    const a = await hashPassword("same-pw");
    const b = await hashPassword("same-pw");
    expect(a).not.toBe(b);
    expect(await comparePassword("same-pw", a)).toBe(true);
    expect(await comparePassword("same-pw", b)).toBe(true);
  });

  it("treats password comparison as case-sensitive", async () => {
    const hash = await hashPassword("Secret");
    expect(await comparePassword("secret", hash)).toBe(false);
  });
});
