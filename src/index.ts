import express from 'express';

import { closePool, pool } from './db';
import { logger } from './logger';
import { webhooksRouter, type RawBodyRequest } from './routes/webhooks';

const app = express();

app.use(
  express.json({
    limit: '256kb',
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = buf;
    },
  }),
);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

app.use('/webhooks', webhooksRouter);

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => {
  logger.info('payments-webhooks listening', { port });
});

process.on('SIGTERM', () => {
  server.close(() => {
    void closePool();
  });
});
