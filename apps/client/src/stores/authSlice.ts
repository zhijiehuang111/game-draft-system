import type { StateCreator } from "zustand";
import type { PublicUser } from "../api/auth.js";
import type { AppStore } from "./index.js";

export interface AuthSlice {
  authStatus: "loading" | "ready";
  user: PublicUser | null;
  setUser(user: PublicUser | null): void;
  logout(): void;
}

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (
  set,
) => ({
  authStatus: "loading",
  user: null,
  setUser: (user) => set({ user, authStatus: "ready" }),
  logout: () =>
    set({
      user: null,
      authStatus: "ready",
      currentRoom: null,
      pendingTradeIncoming: null,
      pendingTradeOutgoing: null,
      queueSize: 0,
      inQueue: false,
    }),
});
