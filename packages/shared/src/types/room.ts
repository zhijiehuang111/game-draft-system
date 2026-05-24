export type Phase = 'initial-pick' | 'bench-trade' | 'lock-in' | 'done' | 'aborted';

export interface PlayerState {
  userId: string;
  username: string;
  slot: number;
  allocated: string[];
  currentChampion: string | null;
}

export interface TradeRequest {
  tradeId: string;
  fromUserId: string;
  toUserId: string;
  offerChampionId: string;
  wantChampionId: string;
  createdAt: number;
  expiresAt: number;
}

export type TradeResolvedReason = 'cancelled' | 'timeout';

export interface RoomState {
  roomId: string;
  phase: Phase;
  phaseEndsAt: number;
  serverNow: number;
  players: PlayerState[];
  bench: string[];
  pendingTrades: TradeRequest[];
  disconnected: Record<string, number>;
}
