import type { StateCreator } from "zustand";
import type { AppStore } from "./index.js";

export interface LobbySlice {
  queueSize: number;
  inQueue: boolean;
  setQueue(state: { size: number; inQueue?: boolean }): void;
}

export const createLobbySlice: StateCreator<AppStore, [], [], LobbySlice> = (
  set,
) => ({
  queueSize: 0,
  inQueue: false,
  setQueue: ({ size, inQueue }) =>
    set((prev) => ({
      queueSize: size,
      inQueue: inQueue ?? prev.inQueue,
    })),
});
