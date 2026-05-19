export interface DraftPlayer {
  userId: string;
  slot: number;
}

export interface DraftEngine {
  createRoom(roomId: string, players: DraftPlayer[]): void;
}

export function createDraftEngine(): DraftEngine {
  return {
    createRoom(roomId, players) {
      console.log('[draft] createRoom stub', roomId, players.map((p) => p.userId));
    },
  };
}
