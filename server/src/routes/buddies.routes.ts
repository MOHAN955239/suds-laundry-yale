import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const buddiesRouter = Router();

buddiesRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM buddies WHERE user_id = ? AND active = 1')
    .get(req.user!.id);
  res.json(row || null);
});

buddiesRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  const building = req.query.building as string | undefined;
  const rows = building
    ? db.prepare(`
        SELECT b.*, u.name, u.college FROM buddies b
        JOIN users u ON u.id = b.user_id
        WHERE b.active = 1 AND b.building = ? AND b.user_id != ?
        ORDER BY b.created_at DESC LIMIT 30
      `).all(building, req.user!.id)
    : db.prepare(`
        SELECT b.*, u.name, u.college FROM buddies b
        JOIN users u ON u.id = b.user_id
        WHERE b.active = 1 AND b.user_id != ?
        ORDER BY b.created_at DESC LIMIT 30
      `).all(req.user!.id);
  res.json(rows);
});

const CreateSchema = z.object({
  building: z.string().min(1),
  message: z.string().max(200).optional(),
});

buddiesRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  const userId = req.user!.id;
  db.prepare('UPDATE buddies SET active = 0 WHERE user_id = ?').run(userId);

  const id = uuid();
  db.prepare(`
    INSERT INTO buddies (id, user_id, building, message, active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(id, userId, parsed.data.building, parsed.data.message || null, Date.now());

  res.json({ id, building: parsed.data.building, message: parsed.data.message || null, active: 1 });
});

buddiesRouter.delete('/me', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE buddies SET active = 0 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});
