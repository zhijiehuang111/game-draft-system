import type { Socket } from 'socket.io';

export function replyError(socket: Socket, code: string, message: string): void {
  socket.emit('error', { code, message });
}
