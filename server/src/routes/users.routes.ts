import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json(req.user);
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  college: z.string().max(20).nullable().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  notify_cycle: z.union([z.boolean(), z.number()]).optional(),
  notify_queue: z.union([z.boolean(), z.number()]).optional(),
  notify_promo: z.union([z.boolean(), z.number()]).optional(),
});

usersRouter.patch('/me', requireAuth, (req: AuthedRequest, res) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  const updates: string[] = [];
  const values: any[] = [];
  const d = parsed.data;

  const asBit = (v: boolean | number | undefined) => (v === undefined ? undefined : (v ? 1 : 0));

  if (d.name !== undefined) { updates.push('name = ?'); values.push(d.name); }
  if (d.college !== undefined) { updates.push('college = ?'); values.push(d.college); }
  if (d.theme !== undefined) { updates.push('theme = ?'); values.push(d.theme); }
  if (d.notify_cycle !== undefined) { updates.push('notify_cycle = ?'); values.push(asBit(d.notify_cycle)); }
  if (d.notify_queue !== undefined) { updates.push('notify_queue = ?'); values.push(asBit(d.notify_queue)); }
  if (d.notify_promo !== undefined) { updates.push('notify_promo = ?'); values.push(asBit(d.notify_promo)); }

  if (updates.length === 0) return res.json(req.user);

  values.push(req.user!.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
  res.json(user);
});

usersRouter.get('/leaderboard', (_req, res) => {
  const colleges = db.prepare(`
    SELECT college, SUM(suds_score) as total, COUNT(*) as members
    FROM users WHERE college IS NOT NULL
    GROUP BY college ORDER BY total DESC
  `).all();

  const users = db.prepare(`
    SELECT name, college, suds_score FROM users
    ORDER BY suds_score DESC LIMIT 20
  `).all();

  res.json({ colleges, users });
});

usersRouter.get('/history', requireAuth, (req: AuthedRequest, res) => {
  const reports = db.prepare(`
    SELECT r.*, m.label, m.building FROM reports r
    JOIN machines m ON m.id = r.machine_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC LIMIT 50
  `).all(req.user!.id);

  const cycles = db.prepare(`
    SELECT c.*, m.label, m.building FROM cycles c
    JOIN machines m ON m.id = c.machine_id
    WHERE c.user_id = ?
    ORDER BY c.started_at DESC LIMIT 50
  `).all(req.user!.id);

  res.json({ reports, cycles });
});
