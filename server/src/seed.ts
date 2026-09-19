import { v4 as uuid } from 'uuid';
import { db } from './db';

const COLLEGES = [
  'BK Berkeley', 'BR Branford', 'DC Davenport', 'ES Ezra Stiles',
  'JE Jonathan Edwards', 'MC Morse', 'PC Pierson', 'SY Saybrook',
  'SM Silliman', 'TD Timothy Dwight', 'TC Trumbull', 'BF Benjamin Franklin',
  'PM Pauli Murray',
];

const ACHIEVEMENTS = [
  { code: 'first_wash', name: 'First Load', description: 'Complete your first cycle', icon: '🧺', threshold: 1 },
  { code: 'five_wash', name: 'Getting Clean', description: 'Complete 5 cycles', icon: '🫧', threshold: 5 },
  { code: 'twenty_wash', name: 'Laundry Legend', description: 'Complete 20 cycles', icon: '👑', threshold: 20 },
  { code: 'eco_warrior', name: 'Eco Warrior', description: 'Reach 500 Suds Score', icon: '🌱', threshold: 500 },
  { code: 'eco_champion', name: 'Eco Champion', description: 'Reach 2000 Suds Score', icon: '🌍', threshold: 2000 },
  { code: 'queue_master', name: 'Queue Master', description: 'Join 10 queues', icon: '🎯', threshold: 10 },
  { code: 'community', name: 'Community Helper', description: 'Mark 5 machines available', icon: '🤝', threshold: 5 },
  { code: 'early_bird', name: 'Early Bird', description: 'Start a cycle before 8am', icon: '🌅', threshold: 1 },
  { code: 'night_owl', name: 'Night Owl', description: 'Start a cycle after 11pm', icon: '🦉', threshold: 1 },
  { code: 'streak_7', name: 'Week Warrior', description: '7-day streak', icon: '🔥', threshold: 7 },
];

export function seedIfEmpty() {
  const achCount = (db.prepare('SELECT COUNT(*) as c FROM achievements').get() as { c: number }).c;
  if (achCount === 0) {
    const insertAch = db.prepare(`
      INSERT INTO achievements (id, code, name, description, icon, threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      for (const a of ACHIEVEMENTS) {
        insertAch.run(uuid(), a.code, a.name, a.description, a.icon, a.threshold);
      }
    });
    tx();
    console.log(`[seed] inserted ${ACHIEVEMENTS.length} achievements`);
  }

  const { c } = db.prepare('SELECT COUNT(*) as c FROM machines').get() as { c: number };
  if (c > 0) return;

  const insert = db.prepare(`
    INSERT INTO machines (id, building, floor, machine_type, label, status, confidence)
    VALUES (?, ?, ?, ?, ?, 'available', 1.0)
  `);

  const tx = db.transaction(() => {
    for (const building of COLLEGES) {
      for (let floor = 1; floor <= 2; floor++) {
        for (let i = 1; i <= 3; i++) {
          insert.run(uuid(), building, floor, 'washer', `Washer ${floor}-${i}`);
        }
        for (let i = 1; i <= 3; i++) {
          insert.run(uuid(), building, floor, 'dryer', `Dryer ${floor}-${i}`);
        }
      }
    }
  });

  tx();
  const total = (db.prepare('SELECT COUNT(*) as c FROM machines').get() as { c: number }).c;
  console.log(`[seed] inserted ${total} machines`);
}

if (require.main === module) seedIfEmpty();
