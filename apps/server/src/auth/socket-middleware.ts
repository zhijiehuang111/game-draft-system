import type { Socket } from 'socket.io';
import { parseCookieHeader } from './cookie-utils.js';
import { AUTH_COOKIE_NAME } from './cookies.js';
import { verifyToken } from './jwt.js';

type Next = (err?: Error) => void;

export function socketAuth(socket: Socket, next: Next): void {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) {
    next(new Error('unauthorized'));
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next(new Error('unauthorized'));
    return;
  }
  socket.data.userId = payload.sub;
  next();
}
