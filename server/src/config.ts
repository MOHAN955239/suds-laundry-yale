import fs from 'fs';
import path from 'path';

// Resolve the built client directory robustly. Depending on how the server is
// started (npm start from repo root, `node server/dist/index.js`, Docker, or
// tsx from server/), the process cwd differs — so we probe known locations
// relative to both this file and the cwd, and use the first that exists.
function resolveClientDist(): string {
  const candidates = [
    process.env.CLIENT_DIST,
    path.join(__dirname, '..', '..', 'client', 'dist'), // server/dist -> repo/client/dist
    path.join(__dirname, '..', 'client', 'dist'),       // Docker: /app/server/dist -> /app/client/dist
    path.join(process.cwd(), 'client', 'dist'),         // cwd = repo root
    path.join(process.cwd(), '..', 'client', 'dist'),   // cwd = server/
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) return c;
  }
  return candidates[1];
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'suds.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  clientDist: resolveClientDist(),
  mlUrl: process.env.ML_URL || 'http://localhost:8000',
};
