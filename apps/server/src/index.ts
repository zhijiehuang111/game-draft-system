import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@app/shared';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
});

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
