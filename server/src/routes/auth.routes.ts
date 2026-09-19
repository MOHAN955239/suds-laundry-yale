import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db, User } from '../db';
import { signToken } from '../auth';

export const authRouter = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  college: z.string().max(20).optional(),
});

authRouter.post('/login', (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid input' });

  const { email, name, college } = parsed.data;
  if (!email.endsWith('@yale.edu')) {
    return res.status(403).json({ error: 'Yale email required' });
  }

  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user) {
    const id = uuid();
    db.prepare(`
      INSERT INTO users (id, email, name, college, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, name, college || null, Date.now());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
  }

  const token = signToken(user);
  res.json({ user, token });
});
