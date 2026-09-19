import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`
    SELECT m.* FROM favorites f
    JOIN machines m ON m.id = f.machine_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user!.id);
  res.json(rows);
});

const ToggleSchema = z.object({ machineId: z.string().uuid() });

favoritesRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = ToggleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  const { machineId } = parsed.data;
  const userId = req.user!.id;

  const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND machine_id = ?')
    .get(userId, machineId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND machine_id = ?').run(userId, machineId);
    return res.json({ favorited: false });
  }

  db.prepare('INSERT INTO favorites (user_id, machine_id, created_at) VALUES (?, ?, ?)')
    .run(userId, machineId, Date.now());
  res.json({ favorited: true });
});
