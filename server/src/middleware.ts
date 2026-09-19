import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';
import { db, User } from './db';

export type AuthedRequest = Request & { user?: User };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid token' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub) as User | undefined;
  if (!user) return res.status(401).json({ error: 'user not found' });

  req.user = user;
  next();
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'internal error' });
}
