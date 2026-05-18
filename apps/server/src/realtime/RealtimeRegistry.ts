import type { Server } from 'socket.io';

export class RealtimeRegistry {
  private socketByUser = new Map<string, string>();
  private roomByUser = new Map<string, string>();

  constructor(private readonly io: Server) {}

  bind(userId: string, socketId: string): void {
    const previous = this.socketByUser.get(userId);
    if (previous && previous !== socketId) {
      this.io.sockets.sockets.get(previous)?.disconnect(true);
    }
    this.socketByUser.set(userId, socketId);
  }

  unbind(socketId: string): void {
    for (const [userId, mappedSocketId] of this.socketByUser) {
      if (mappedSocketId === socketId) {
        this.socketByUser.delete(userId);
        this.roomByUser.delete(userId);
        return;
      }
    }
  }

  getSocketId(userId: string): string | undefined {
    return this.socketByUser.get(userId);
  }

  getUserId(socketId: string): string | undefined {
    for (const [userId, mappedSocketId] of this.socketByUser) {
      if (mappedSocketId === socketId) return userId;
    }
    return undefined;
  }

  setRoom(userId: string, roomId: string): void {
    this.roomByUser.set(userId, roomId);
  }

  clearRoom(userId: string): void {
    this.roomByUser.delete(userId);
  }

  getRoom(userId: string): string | undefined {
    return this.roomByUser.get(userId);
  }
}
