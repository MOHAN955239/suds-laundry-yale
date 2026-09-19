# Suds 🧺

**Making laundry at Yale predictable, social, and sustainable.**

Software-only laundry platform for Yale students. No hardware, no IoT sensors,
no facility modifications — crowdsourced machine status plus ML prediction.

---

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

- API → http://localhost:4000
- Web → http://localhost:5173

Sign in with any `@yale.edu` email (demo auth, no password).

### Optional: ML prediction service

The server falls back to a heuristic if this isn't running, so it's optional.

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python train.py
python -m uvicorn main:app --port 8000
```

### Production

```bash
npm run build
npm start          # everything on http://localhost:4000
```

### Docker

```bash
docker compose up --build
```

---

## Verify it works

```bash
# terminal 1
npm run dev
# terminal 2 (once server is up)
npm run selfcheck
```

Expected output: `=== Suds Self-Check: 28/28 passed ===`

### Populate demo data (before recording a demo video)

```bash
npm run demo-seed
```

Creates 8 demo users and 60 historical cycles so the Stats heatmap,
7-day chart, and leaderboards aren't empty.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CLIENT     │◄───►│   SERVER     │◄───►│  ML SERVICE  │
│ React + Vite │ REST│ Express + TS │HTTP │   FastAPI    │
│     PWA      │  WS │  SQLite + ws │     │ scikit-learn │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────────────┐
                     │  SQLite WAL  │
                     │  11 tables   │
                     └──────────────┘
```

- **server/** — Node 20 + Express 4 + TypeScript + better-sqlite3 + ws + zod + JWT
- **client/** — React 18 + Vite 5 + TypeScript + plain CSS (PWA, light/dark)
- **ml/** — Python + FastAPI + GradientBoostingRegressor

One Node process serves API + WebSocket + static SPA in production.

---

## Features

| Area | Features |
|---|---|
| Machines | Live map across 13 colleges (156 machines), search, filter by type, sort by label/floor/status |
| Reporting | One-tap Start / Done / Available / Report Issue (with note) |
| Queue | Join, leave, auto-renumber, notify next in line |
| Prediction | ML availability estimate with heuristic fallback + confidence score |
| Gamification | Suds Score, streaks, 10 achievements, college + user leaderboards |
| Social | Laundry Buddy listings per building |
| Insight | Personal stats, 7-day chart, "best time to wash" heatmap |
| Account | Favorites, notifications, history, profile edit, dark mode, settings |
| Platform | PWA installable, WebSocket live updates, JWT auth, rate limiting |

---

## API

All routes under `/api`.

```
POST   /auth/login                  { email, name, college } → { user, token }
GET    /users/me
PATCH  /users/me                    { name?, college?, theme?, notify_* }
GET    /users/leaderboard
GET    /users/history

GET    /machines?building=&type=&sort=
GET    /machines/buildings
GET    /machines/search?q=
GET    /machines/:id                → { machine, prediction, queue, reports, activeCycle }
POST   /machines/:id/report         { reportType, note? }
GET    /machines/:id/prediction

POST   /queues                      { machineId }
DELETE /queues/:id
GET    /queues/me

GET    /favorites
POST   /favorites                   { machineId }  (toggles)

GET    /notifications
GET    /notifications/unread-count
POST   /notifications/:id/read
POST   /notifications/read-all
DELETE /notifications/:id

GET    /achievements
GET    /stats/me
GET    /stats/best-time?building=
GET    /buddies?building=  |  GET /buddies/me  |  POST /buddies  |  DELETE /buddies/me
POST   /feedback                    { message }
GET    /health
GET    /status                      → db counts + ML reachability
```

WebSocket at `/ws` broadcasts `machine_update` and `queue_update`.

---

## Business rules

| Action | Effect |
|---|---|
| `start` | status → `in_use`, creates cycle (washer 35min, dryer 45min), updates streak |
| `done` | status → `almost_done`, closes cycle, **+10** Suds Score |
| `available` | status → `available`, **+5** Suds Score, notifies next in queue |
| `issue` | status → `out_of_order`, stores note, shown as warning to others |

**Prediction:** available → now · out_of_order → +6hr (conf 0.4) · otherwise ML
service (800ms timeout) falling back to `avg_cycle − elapsed`, with confidence
decaying as the last report goes stale.

---

## Deploy

**Render / Railway / Fly.io:**
- Build: `npm install && npm run build`
- Start: `npm start`
- Env: `JWT_SECRET`, `NODE_ENV=production`
- Mount a persistent volume for SQLite, set `DB_PATH` to a path inside it

---

## Notes

- PWA icons: drop `icon-192.png` and `icon-512.png` into `client/public/`
  (referenced by `manifest.json`; the app works without them, they just make
  the install prompt look right).
- Demo auth is intentionally password-less. Swap `auth.routes.ts` for Yale CAS
  or OAuth before any real deployment.
