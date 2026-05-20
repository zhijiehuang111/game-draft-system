export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface DraftResult {
  roomId: string;
  userId: string;
  finalChampionId: string;
  completedAt: Date;
}
