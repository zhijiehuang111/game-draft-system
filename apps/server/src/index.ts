import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from 'node:http';
import { authRouter } from './auth/routes.js';
import { championsRouter } from './champions/routes.js';
import { createRealtime } from './realtime/io.js';

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/champions', championsRouter);

createRealtime(httpServer);

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`);
});
