import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { apiRouter } from './routes';
import { attachWebSocket } from './socket';
import { seedIfEmpty } from './seed';
import { errorHandler } from './middleware';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
}));

app.use('/api', apiRouter);

if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(config.clientDist, 'index.html'));
  });
}

app.use(errorHandler);

const server = http.createServer(app);
attachWebSocket(server);

seedIfEmpty();

server.listen(config.port, () => {
  console.log(`🧺 Suds running → http://localhost:${config.port} [${config.env}]`);
});
