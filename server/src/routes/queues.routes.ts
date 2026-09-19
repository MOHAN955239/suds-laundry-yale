import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';
import { broadcast } from '../socket';
import { pushNotification } from './notifications.routes';
import { checkAchievements } from './achievements.routes';

export const queuesRouter = Router();

const JoinSchema = z.object({ machineId: z.string().uuid() });

queuesRouter.post('/', requireAuth, (req: AuthedRequest, res) => {
  const parsed = JoinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  const { machineId } = parsed.data;
  const userId = req.user!.id;

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId) as { id: string; label: string } | undefined;
  if (!machine) return res.status(404).json({ error: 'machine not found' });

  const existing = db.prepare(`
    SELECT * FROM queues WHERE machine_id = ? AND user_id = ? AND status = 'waiting'
  `).get(machineId, userId) as any;
  if (existing) return res.json(existing);

  const { m } = db.prepare(`
    SELECT COALESCE(MAX(position), 0) as m FROM queues
    WHERE machine_id = ? AND status = 'waiting'
  `).get(machineId) as { m: number };

  const id = uuid();
  db.prepare(`
    INSERT INTO queues (id, machine_id, user_id, position, joined_at, status)
    VALUES (?, ?, ?, ?, ?, 'waiting')
  `).run(id, machineId, userId, m + 1, Date.now());

  pushNotification(userId, 'queue', 'Joined queue', `You're #${m + 1} in line for ${machine.label}.`, machineId);
  checkAchievements(userId);

  broadcast({ type: 'queue_update', machineId });
  res.json({ id, machineId, userId, position: m + 1, status: 'waiting' });
});

queuesRouter.delete('/:id', requireAuth, (req: AuthedRequest, res) => {
  const entry = db.prepare('SELECT * FROM queues WHERE id = ?').get(req.params.id) as any;
  if (!entry) return res.status(404).json({ error: 'not found' });
  if (entry.user_id !== req.user!.id) return res.status(403).json({ error: 'not yours' });

  db.prepare("UPDATE queues SET status = 'cancelled' WHERE id = ?").run(req.params.id);

  const remaining = db.prepare(`
    SELECT id FROM queues WHERE machine_id = ? AND status = 'waiting' ORDER BY position
  `).all(entry.machine_id) as { id: string }[];
  remaining.forEach((q, i) => {
    db.prepare('UPDATE queues SET position = ? WHERE id = ?').run(i + 1, q.id);
  });

  broadcast({ type: 'queue_update', machineId: entry.machine_id });
  res.json({ ok: true });
});

queuesRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const rows = db.prepare(`
    SELECT q.id, q.machine_id, q.position, q.status, q.joined_at,
           m.building, m.floor, m.label, m.machine_type
    FROM queues q JOIN machines m ON m.id = q.machine_id
    WHERE q.user_id = ? AND q.status IN ('waiting','notified')
    ORDER BY q.joined_at DESC
  `).all(req.user!.id);
  res.json(rows);
});
