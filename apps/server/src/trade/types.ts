import type { TradeRequest, TradeResolvedReason } from '@app/shared';

export type { TradeRequest, TradeResolvedReason };

export const TRADE_TTL_MS = 10_000;

export type TradeRequestError =
  | 'wrong-phase'
  | 'self-trade'
  | 'target-not-in-room'
  | 'offer-not-held'
  | 'want-not-held'
  | 'has-pending-trade'
  | 'target-busy';

export type TradeRespondError =
  | 'no-pending-trade'
  | 'not-trade-target'
  | 'wrong-phase';

export type TradeCancelError =
  | 'no-pending-trade'
  | 'not-trade-owner'
  | 'wrong-phase';
