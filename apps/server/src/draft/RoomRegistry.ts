import type { DraftRoom } from './Room.js';

export class RoomRegistry {
  private byId = new Map<string, DraftRoom>();
  private roomIdByUser = new Map<string, string>();

  add(room: DraftRoom, userIds: readonly string[]): void {
    this.byId.set(room.roomId, room);
    for (const userId of userIds) this.roomIdByUser.set(userId, room.roomId);
  }

  remove(roomId: string): void {
    const room = this.byId.get(roomId);
    if (!room) return;
    this.byId.delete(roomId);
    for (const [userId, mappedRoomId] of this.roomIdByUser) {
      if (mappedRoomId === roomId) this.roomIdByUser.delete(userId);
    }
    room.destroy();
  }

  get(roomId: string): DraftRoom | undefined {
    return this.byId.get(roomId);
  }

  getByUser(userId: string): DraftRoom | undefined {
    const roomId = this.roomIdByUser.get(userId);
    if (!roomId) return undefined;
    return this.byId.get(roomId);
  }
}
