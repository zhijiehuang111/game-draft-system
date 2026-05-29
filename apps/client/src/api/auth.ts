import type { CredentialsInput } from "@app/shared";
import { request } from "./http.js";

export interface PublicUser {
  id: string;
  username: string;
}

export function register(
  input: CredentialsInput,
): Promise<{ user: PublicUser }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: CredentialsInput): Promise<{ user: PublicUser }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<{ ok: true }> {
  return request("/auth/logout", { method: "POST" });
}

export function getMe(): Promise<{ user: PublicUser }> {
  return request("/auth/me");
}
