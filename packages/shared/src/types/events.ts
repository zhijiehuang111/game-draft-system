import type { Phase, RoomState, TradeRequest, TradeResolvedReason } from './room.js';
import type { DraftResult } from './db.js';

export interface ServerToClientEvents {
  'queue:update': (payload: { size: number; position?: number }) => void;
  'room:start': (payload: { roomId: string }) => void;
  'room:state': (payload: RoomState) => void;
  'room:phase': (payload: { phase: Phase; phaseEndsAt: number; serverNow: number }) => void;
  'trade:incoming': (payload: TradeRequest) => void;
  'trade:pending': (payload: TradeRequest) => void;
  'trade:resolved': (payload: { tradeId: string; fromUserId: string; toUserId: string; accepted: boolean; reason?: TradeResolvedReason }) => void;
  'room:result': (payload: DraftResult[]) => void;
  'room:aborted': (payload: { reason: string }) => void;
  'player:disconnected': (payload: { userId: string }) => void;
  'player:reconnected': (payload: { userId: string }) => void;
  'error': (payload: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'queue:join': () => void;
  'queue:leave': () => void;
  'room:join': (payload: { roomId: string }) => void;
  'pick:initial': (payload: { championId: string }) => void;
  'pick:bench': (payload: { championId: string }) => void;
  'trade:request': (payload: { targetUserId: string; offerChampionId: string; wantChampionId: string }) => void;
  'trade:respond': (payload: { tradeId: string; accept: boolean }) => void;
  'trade:cancel': (payload: { tradeId: string }) => void;
}

export interface SocketData {
  userId: string;
}

export type SocketEvent = keyof ServerToClientEvents | keyof ClientToServerEvents;
