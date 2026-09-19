import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const notificationsRouter = Router();

notificationsRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.user!.id);
  res.json(rows);
});

notificationsRouter.get('/unread-count', requireAuth, (req: AuthedRequest, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0
  `).get(req.user!.id) as { c: number };
  res.json({ count: row.c });
});

notificationsRouter.post('/:id/read', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.id);
  res.json({ ok: true });
});

notificationsRouter.post('/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

notificationsRouter.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.id);
  res.json({ ok: true });
});

export function pushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  machineId?: string
) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, machine_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), userId, type, title, body, machineId || null, Date.now());
}
