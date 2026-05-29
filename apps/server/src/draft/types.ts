import type { Phase, PlayerState, RoomState, TradeRequest } from "@app/shared";

export type { Phase, PlayerState, RoomState, TradeRequest };

export interface RoomPlayerInit {
  userId: string;
  username: string;
  slot: number;
}

export const PHASE_DURATION_MS: Record<
  Exclude<Phase, "done" | "aborted">,
  number
> = {
  "initial-pick": 15_000,
  "bench-trade": 45_000,
  "lock-in": 3_000,
};
