import type { DraftResult, Phase, RoomState, TradeRequest } from '@app/shared';
import type { StateCreator } from 'zustand';
import type { AppStore } from './index.js';

export interface RoomSlice {
  currentRoom: RoomState | null;
  serverOffsetMs: number;
  pendingTradeIncoming: TradeRequest | null;
  pendingTradeOutgoing: { tradeId: string } | null;
  draftResult: DraftResult[] | null;
  setRoomState(state: RoomState | null): void;
  applyPhaseChange(payload: { phase: Phase; phaseEndsAt: number; serverNow: number }): void;
  setPendingTradeIncoming(trade: TradeRequest | null): void;
  setPendingTradeOutgoing(trade: { tradeId: string } | null): void;
  setDraftResult(result: DraftResult[] | null): void;
  clearRoom(): void;
}

export const createRoomSlice: StateCreator<AppStore, [], [], RoomSlice> = (set) => ({
  currentRoom: null,
  serverOffsetMs: 0,
  pendingTradeIncoming: null,
  pendingTradeOutgoing: null,
  draftResult: null,
  setRoomState: (state) =>
    set(() => ({
      currentRoom: state,
      serverOffsetMs: state ? state.serverNow - Date.now() : 0,
    })),
  applyPhaseChange: ({ phase, phaseEndsAt, serverNow }) =>
    set((prev) => ({
      serverOffsetMs: serverNow - Date.now(),
      currentRoom: prev.currentRoom
        ? { ...prev.currentRoom, phase, phaseEndsAt }
        : prev.currentRoom,
    })),
  setPendingTradeIncoming: (trade) => set({ pendingTradeIncoming: trade }),
  setPendingTradeOutgoing: (trade) => set({ pendingTradeOutgoing: trade }),
  setDraftResult: (result) => set({ draftResult: result }),
  clearRoom: () =>
    set({
      currentRoom: null,
      serverOffsetMs: 0,
      pendingTradeIncoming: null,
      pendingTradeOutgoing: null,
      draftResult: null,
    }),
});
