import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@app/shared';
import { authRouter } from './auth/routes.js';
import { socketAuth } from './auth/socket-middleware.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log('socket connected', socket.id, 'userId=', socket.data.userId);
});

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
