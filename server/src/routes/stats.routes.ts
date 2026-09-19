import { Router } from 'express';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const statsRouter = Router();

statsRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const cycles = (db.prepare(
    'SELECT COUNT(*) as c FROM cycles WHERE user_id = ? AND completed_at IS NOT NULL'
  ).get(userId) as any).c;

  const active = (db.prepare(
    'SELECT COUNT(*) as c FROM cycles WHERE user_id = ? AND completed_at IS NULL'
  ).get(userId) as any).c;

  const reports = (db.prepare(
    'SELECT COUNT(*) as c FROM reports WHERE user_id = ?'
  ).get(userId) as any).c;

  const available = (db.prepare(
    "SELECT COUNT(*) as c FROM reports WHERE user_id = ? AND report_type = 'available'"
  ).get(userId) as any).c;

  const week: Array<{ day: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i);
    const end = start.getTime() + 24 * 60 * 60 * 1000;
    const c = (db.prepare(
      'SELECT COUNT(*) as c FROM cycles WHERE user_id = ? AND started_at >= ? AND started_at < ?'
    ).get(userId, start.getTime(), end) as any).c;
    week.push({ day: start.toLocaleDateString('en', { weekday: 'short' }), count: c });
  }

  const heatmap: Array<{ hour: number; count: number }> = [];
  for (let h = 0; h < 24; h++) {
    const c = (db.prepare(`
      SELECT COUNT(*) as c FROM cycles
      WHERE CAST(strftime('%H', datetime(started_at/1000, 'unixepoch')) AS INTEGER) = ?
    `).get(h) as any).c;
    heatmap.push({ hour: h, count: c });
  }

  res.json({ cycles, active, reports, available, week, heatmap });
});

statsRouter.get('/best-time', requireAuth, (req: AuthedRequest, res) => {
  const building = req.query.building as string | undefined;

  const rows = building
    ? db.prepare(`
        SELECT CAST(strftime('%H', datetime(c.started_at/1000, 'unixepoch')) AS INTEGER) as hour,
               COUNT(*) as count
        FROM cycles c JOIN machines m ON m.id = c.machine_id
        WHERE m.building = ?
        GROUP BY hour ORDER BY hour
      `).all(building) as Array<{ hour: number; count: number }>
    : db.prepare(`
        SELECT CAST(strftime('%H', datetime(started_at/1000, 'unixepoch')) AS INTEGER) as hour,
               COUNT(*) as count
        FROM cycles
        GROUP BY hour ORDER BY hour
      `).all() as Array<{ hour: number; count: number }>;

  const map = new Map(rows.map((r) => [r.hour, r.count]));
  const heatmap: Array<{ hour: number; count: number }> = [];
  for (let h = 0; h < 24; h++) {
    heatmap.push({ hour: h, count: map.get(h) || 0 });
  }

  let bestStart = 0;
  let bestSum = Infinity;
  for (let h = 0; h < 21; h++) {
    const sum = heatmap[h].count + heatmap[h + 1].count + heatmap[h + 2].count;
    if (sum < bestSum) { bestSum = sum; bestStart = h; }
  }

  res.json({ heatmap, bestWindow: { start: bestStart, end: bestStart + 3 } });
});
