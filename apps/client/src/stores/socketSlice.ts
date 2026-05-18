import type { ClientToServerEvents, ServerToClientEvents } from '@app/shared';
import type { Socket } from 'socket.io-client';
import type { StateCreator } from 'zustand';
import type { AppStore } from './index.js';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketSlice {
  socket: AppSocket | null;
  socketConnected: boolean;
  setSocket(socket: AppSocket | null): void;
  setSocketConnected(connected: boolean): void;
}

export const createSocketSlice: StateCreator<AppStore, [], [], SocketSlice> = (set) => ({
  socket: null,
  socketConnected: false,
  setSocket: (socket) => set({ socket }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),
});
