import jwt from 'jsonwebtoken';
import { config } from './config';
import type { User } from './db';

export function signToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { sub: string; email: string };
  } catch {
    return null;
  }
}
