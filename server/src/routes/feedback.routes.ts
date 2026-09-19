import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const feedbackRouter = Router();

const Schema = z.object({ message: z.string().min(1).max(2000) });

feedbackRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  db.prepare(`
    INSERT INTO feedback (id, user_id, message, created_at)
    VALUES (?, ?, ?, ?)
  `).run(uuid(), req.user!.id, parsed.data.message, Date.now());

  res.json({ ok: true });
});
