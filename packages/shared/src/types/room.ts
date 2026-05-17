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
}

export interface RoomState {
  roomId: string;
  phase: Phase;
  phaseEndsAt: number;
  serverNow: number;
  players: PlayerState[];
  bench: string[];
  pendingTrade: TradeRequest | null;
  disconnected: Record<string, number>;
}
