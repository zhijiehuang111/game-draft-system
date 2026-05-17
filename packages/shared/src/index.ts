export type Phase = 'initial-pick' | 'bench-trade' | 'lock-in' | 'done' | 'aborted';

export interface Champion {
  id: string;
  name: string;
  imageUrl: string;
}

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

export interface DraftResult {
  userId: string;
  championId: string;
}

export interface ServerToClientEvents {
  'queue:update': (payload: { size: number; position: number }) => void;
  'room:start': (payload: { roomId: string }) => void;
  'room:state': (payload: RoomState) => void;
  'room:phase': (payload: { phase: Phase; phaseEndsAt: number; serverNow: number }) => void;
  'trade:incoming': (payload: TradeRequest) => void;
  'trade:pending': (payload: { tradeId: string }) => void;
  'trade:resolved': (payload: { tradeId: string; accepted: boolean }) => void;
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
}

export type SocketEvent = keyof ServerToClientEvents | keyof ClientToServerEvents;
