import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthedRequest } from '../middleware';

export const achievementsRouter = Router();

achievementsRouter.get('/', requireAuth, (req: AuthedRequest, res) => {
  const all = db.prepare('SELECT * FROM achievements ORDER BY threshold').all() as Array<{
    id: string; code: string; name: string; description: string; icon: string; threshold: number;
  }>;
  const unlocked = db.prepare(
    'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?'
  ).all(req.user!.id) as Array<{ achievement_id: string; unlocked_at: number }>;

  const unlockedMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

  res.json(all.map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlocked_at: unlockedMap.get(a.id) || null,
  })));
});

export function checkAchievements(userId: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return;

  const cycleCount = (db.prepare(
    'SELECT COUNT(*) as c FROM cycles WHERE user_id = ? AND completed_at IS NOT NULL'
  ).get(userId) as any).c;

  const queueCount = (db.prepare(
    'SELECT COUNT(*) as c FROM queues WHERE user_id = ?'
  ).get(userId) as any).c;

  const availableCount = (db.prepare(
    "SELECT COUNT(*) as c FROM reports WHERE user_id = ? AND report_type = 'available'"
  ).get(userId) as any).c;

  const achievements = db.prepare('SELECT * FROM achievements').all() as any[];
  const unlocked = new Set(
    (db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?')
      .all(userId) as any[]).map((r) => r.achievement_id)
  );

  const check = (code: string, condition: boolean) => {
    const a = achievements.find((x) => x.code === code);
    if (!a || unlocked.has(a.id)) return;
    if (!condition) return;
    db.prepare(
      'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
    ).run(userId, a.id, Date.now());
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, created_at)
      VALUES (?, ?, 'achievement', ?, ?, ?)
    `).run(uuid(), userId, `${a.icon} Achievement Unlocked!`, a.name, Date.now());
  };

  check('first_wash', cycleCount >= 1);
  check('five_wash', cycleCount >= 5);
  check('twenty_wash', cycleCount >= 20);
  check('eco_warrior', user.suds_score >= 500);
  check('eco_champion', user.suds_score >= 2000);
  check('queue_master', queueCount >= 10);
  check('community', availableCount >= 5);
  check('streak_7', user.streak >= 7);
}
