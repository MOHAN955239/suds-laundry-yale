import { Router } from 'express';
import { db } from '../db';
import { config } from '../config';

export const statusRouter = Router();

statusRouter.get('/', async (_req, res) => {
  const machineCount = (db.prepare('SELECT COUNT(*) as c FROM machines').get() as any).c;
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const achievementCount = (db.prepare('SELECT COUNT(*) as c FROM achievements').get() as any).c;

  let mlOk = false;
  try {
    const r = await fetch(`${config.mlUrl}/health`, { signal: AbortSignal.timeout(500) });
    mlOk = r.ok;
  } catch {
    // ML service down — heuristic fallback covers it, not an error
  }

  res.json({
    ok: true,
    db: { connected: true, machines: machineCount, users: userCount, achievements: achievementCount },
    ml_service: mlOk ? 'connected' : 'unavailable (using heuristic fallback)',
    uptime_seconds: Math.floor(process.uptime()),
  });
});
