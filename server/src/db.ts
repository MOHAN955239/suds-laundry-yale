import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config';

const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.dbPath);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

export type User = {
  id: string;
  email: string;
  name: string;
  college: string | null;
  suds_score: number;
  streak: number;
  last_active_date: string | null;
  theme: 'light' | 'dark';
  notify_cycle: number;
  notify_queue: number;
  notify_promo: number;
  created_at: number;
};

export type Machine = {
  id: string;
  building: string;
  floor: number;
  machine_type: 'washer' | 'dryer';
  label: string;
  status: 'available' | 'in_use' | 'almost_done' | 'out_of_order' | 'reserved';
  last_reported_at: number | null;
  confidence: number;
  issue_note: string | null;
};
