import { v4 as uuid } from 'uuid';
import { db } from './db';
import { seedIfEmpty } from './seed';

const DEMO_NAMES: Array<[string, string]> = [
  ['Priya Sharma', 'BK Berkeley'], ['Jordan Lee', 'TD Timothy Dwight'],
  ['Sam Okafor', 'DC Davenport'], ['Maya Chen', 'MC Morse'],
  ['Alex Rivera', 'SY Saybrook'], ['Taylor Kim', 'PC Pierson'],
  ['Jamie Patel', 'BR Branford'], ['Noah Silva', 'TC Trumbull'],
];

function daysAgo(n: number, hour: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.getTime();
}

export function demoSeed() {
  seedIfEmpty();
  console.log('[demo-seed] creating demo users and history...');

  const userIds: string[] = [];
  for (const [name, college] of DEMO_NAMES) {
    const email = `${name.toLowerCase().replace(' ', '.')}@yale.edu`;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (!existing) {
      const id = uuid();
      db.prepare(`
        INSERT INTO users (id, email, name, college, suds_score, streak, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, email, name, college, Math.floor(Math.random() * 400) + 20,
             Math.floor(Math.random() * 6), Date.now());
      userIds.push(id);
    } else {
      userIds.push(existing.id);
    }
  }

  const machines = db.prepare('SELECT id, machine_type FROM machines LIMIT 40').all() as Array<{ id: string; machine_type: string }>;
  if (machines.length === 0) {
    console.log('[demo-seed] no machines found, aborting');
    return;
  }

  const tx = db.transaction(() => {
    for (let i = 0; i < 60; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const machine = machines[Math.floor(Math.random() * machines.length)];
      const day = Math.floor(Math.random() * 14);
      const hour = Math.random() < 0.6
        ? 17 + Math.floor(Math.random() * 6)
        : Math.floor(Math.random() * 24);
      const started = daysAgo(day, hour);
      const duration = (machine.machine_type === 'washer' ? 35 : 45) * 60 * 1000;

      db.prepare(`
        INSERT INTO cycles (id, machine_id, user_id, started_at, expected_end_at, completed_at, cycle_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuid(), machine.id, userId, started, started + duration, started + duration, machine.machine_type);

      db.prepare(`
        INSERT INTO reports (id, machine_id, user_id, report_type, created_at)
        VALUES (?, ?, ?, 'done', ?)
      `).run(uuid(), machine.id, userId, started + duration);
    }
  });

  tx();
  console.log(`[demo-seed] done: ${userIds.length} users, 60 cycles`);
}

if (require.main === module) demoSeed();
