import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db, Machine } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';
import { predictAvailability } from '../predict';
import { broadcast } from '../socket';
import { pushNotification } from './notifications.routes';
import { checkAchievements } from './achievements.routes';

export const machinesRouter = Router();

machinesRouter.get('/', (req, res) => {
  const { building, type, sort } = req.query as Record<string, string | undefined>;

  let sql = 'SELECT * FROM machines WHERE 1=1';
  const params: any[] = [];
  if (building) { sql += ' AND building = ?'; params.push(building); }
  if (type === 'washer' || type === 'dryer') { sql += ' AND machine_type = ?'; params.push(type); }

  if (sort === 'floor') sql += ' ORDER BY floor, machine_type, label';
  else if (sort === 'status') sql += ` ORDER BY
    CASE status WHEN 'available' THEN 0 WHEN 'almost_done' THEN 1
                WHEN 'in_use' THEN 2 ELSE 3 END, floor`;
  else sql += ' ORDER BY building, floor, machine_type, label';

  res.json(db.prepare(sql).all(...params));
});

machinesRouter.get('/buildings', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT building FROM machines ORDER BY building').all() as { building: string }[];
  res.json(rows.map((r) => r.building));
});

machinesRouter.get('/search', (req, res) => {
  const q = `%${((req.query.q as string) || '').toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT * FROM machines
    WHERE LOWER(label) LIKE ? OR LOWER(building) LIKE ?
    ORDER BY building, floor, label LIMIT 30
  `).all(q, q);
  res.json(rows);
});

machinesRouter.get('/:id', async (req, res) => {
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id) as Machine | undefined;
  if (!machine) return res.status(404).json({ error: 'not found' });

  const prediction = await predictAvailability(machine);

  const queue = db.prepare(`
    SELECT q.id, q.user_id, q.position, q.status, u.name
    FROM queues q JOIN users u ON u.id = q.user_id
    WHERE q.machine_id = ? AND q.status IN ('waiting','notified')
    ORDER BY q.position
  `).all(machine.id);

  const reports = db.prepare(`
    SELECT r.id, r.report_type, r.note, r.created_at, u.name
    FROM reports r JOIN users u ON u.id = r.user_id
    WHERE r.machine_id = ?
    ORDER BY r.created_at DESC LIMIT 10
  `).all(machine.id);

  const activeCycle = db.prepare(`
    SELECT * FROM cycles WHERE machine_id = ? AND completed_at IS NULL
    ORDER BY started_at DESC LIMIT 1
  `).get(machine.id);

  res.json({ machine, prediction, queue, reports, activeCycle: activeCycle || null });
});

const ReportSchema = z.object({
  reportType: z.enum(['start', 'done', 'available', 'issue']),
  note: z.string().max(200).optional(),
});

machinesRouter.post('/:id/report', requireAuth, (req: AuthedRequest, res) => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid reportType' });

  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id) as Machine | undefined;
  if (!machine) return res.status(404).json({ error: 'machine not found' });

  const user = req.user!;
  const { reportType, note } = parsed.data;
  const now = Date.now();

  const statusMap: Record<string, Machine['status']> = {
    start: 'in_use',
    done: 'almost_done',
    available: 'available',
    issue: 'out_of_order',
  };
  const newStatus = statusMap[reportType];

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO reports (id, machine_id, user_id, report_type, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), machine.id, user.id, reportType, note || null, now);

    db.prepare('UPDATE machines SET status = ?, last_reported_at = ?, issue_note = ? WHERE id = ?')
      .run(newStatus, now, reportType === 'issue' ? (note || null) : null, machine.id);

    if (reportType === 'start') {
      const avg = machine.machine_type === 'washer' ? 35 : 45;
      db.prepare(`
        INSERT INTO cycles (id, machine_id, user_id, started_at, expected_end_at, cycle_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuid(), machine.id, user.id, now, now + avg * 60 * 1000, machine.machine_type);

      const today = new Date().toISOString().split('T')[0];
      const u = db.prepare('SELECT last_active_date FROM users WHERE id = ?').get(user.id) as { last_active_date: string | null };
      if (u.last_active_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (u.last_active_date === yStr) {
          db.prepare('UPDATE users SET streak = streak + 1, last_active_date = ? WHERE id = ?').run(today, user.id);
        } else {
          db.prepare('UPDATE users SET streak = 1, last_active_date = ? WHERE id = ?').run(today, user.id);
        }
      }
    }

    if (reportType === 'done') {
      db.prepare('UPDATE cycles SET completed_at = ? WHERE machine_id = ? AND completed_at IS NULL')
        .run(now, machine.id);
      db.prepare('UPDATE users SET suds_score = suds_score + 10 WHERE id = ?').run(user.id);
    }

    if (reportType === 'available') {
      db.prepare('UPDATE users SET suds_score = suds_score + 5 WHERE id = ?').run(user.id);
      const next = db.prepare(`
        SELECT id, user_id FROM queues WHERE machine_id = ? AND status = 'waiting'
        ORDER BY position LIMIT 1
      `).get(machine.id) as { id: string; user_id: string } | undefined;
      if (next) {
        db.prepare("UPDATE queues SET status = 'notified' WHERE id = ?").run(next.id);
        pushNotification(
          next.user_id,
          'queue',
          'Your turn! 🧺',
          `${machine.label} in ${machine.building} is now available.`,
          machine.id
        );
      }
    }
  });

  tx();
  checkAchievements(user.id);

  const updated = db.prepare('SELECT * FROM machines WHERE id = ?').get(machine.id);
  broadcast({ type: 'machine_update', machine: updated });

  res.json({ ok: true, machine: updated });
});

machinesRouter.get('/:id/prediction', async (req, res) => {
  const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id) as Machine | undefined;
  if (!machine) return res.status(404).json({ error: 'not found' });
  res.json(await predictAvailability(machine));
});
