export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export type RoomStatus = 'drafting' | 'completed' | 'aborted';

export interface Room {
  id: string;
  type: string;
  inviteCode: string | null;
  status: RoomStatus;
  abortReason: string | null;
  createdAt: Date;
  finishedAt: Date | null;
}

export interface RoomPlayer {
  roomId: string;
  userId: string;
  slot: number;
  joinedAt: Date;
}

export interface DraftResult {
  roomId: string;
  userId: string;
  finalChampionId: string;
  completedAt: Date;
}
