import { create } from "zustand";
import { createAuthSlice, type AuthSlice } from "./authSlice.js";
import { createChampionsSlice, type ChampionsSlice } from "./championsSlice.js";
import { createLobbySlice, type LobbySlice } from "./lobbySlice.js";
import { createRoomSlice, type RoomSlice } from "./roomSlice.js";
import { createSocketSlice, type SocketSlice } from "./socketSlice.js";

export type AppStore = AuthSlice &
  ChampionsSlice &
  LobbySlice &
  RoomSlice &
  SocketSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAuthSlice(...a),
  ...createChampionsSlice(...a),
  ...createLobbySlice(...a),
  ...createRoomSlice(...a),
  ...createSocketSlice(...a),
}));
