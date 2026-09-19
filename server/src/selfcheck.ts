const BASE = process.env.BASE_URL || 'http://localhost:4000';

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e: any) {
    results.push({ name, ok: false, detail: e.message });
  }
}

async function main() {
  let token = '';
  let machineId = '';

  await check('health', async () => {
    const r = await fetch(`${BASE}/api/health`);
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  await check('login rejects non-yale email', async () => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@gmail.com', name: 'Test' }),
    });
    if (r.status !== 403) throw new Error(`expected 403, got ${r.status}`);
  });

  await check('login accepts yale email', async () => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'selfcheck@yale.edu', name: 'Self Check', college: 'BK' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!data.token) throw new Error('no token returned');
    token = data.token;
  });

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

  await check('get machines list', async () => {
    const r = await fetch(`${BASE}/api/machines`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const rows: any[] = await r.json();
    if (rows.length === 0) throw new Error('no machines seeded');
    machineId = rows[0].id;
  });

  await check('get machine detail (with prediction)', async () => {
    const r = await fetch(`${BASE}/api/machines/${machineId}`);
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    const data: any = await r.json();
    if (!data.prediction) throw new Error('no prediction field');
  });

  await check('report: start cycle', async () => {
    const r = await fetch(`${BASE}/api/machines/${machineId}/report`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reportType: 'start' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
  });

  await check('report: mark done, score increases', async () => {
    const before = (await (await fetch(`${BASE}/api/users/me`, { headers: auth() })).json()) as any;
    const r = await fetch(`${BASE}/api/machines/${machineId}/report`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reportType: 'done' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const after = (await (await fetch(`${BASE}/api/users/me`, { headers: auth() })).json()) as any;
    if (after.suds_score <= before.suds_score) throw new Error('score did not increase');
  });

  await check('report: mark available, +5 score', async () => {
    const r = await fetch(`${BASE}/api/machines/${machineId}/report`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reportType: 'available' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
  });

  await check('report: issue with note', async () => {
    const r = await fetch(`${BASE}/api/machines/${machineId}/report`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reportType: 'issue', note: 'selfcheck test note' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (data.machine.status !== 'out_of_order') throw new Error('status did not update to out_of_order');
    if (data.machine.issue_note !== 'selfcheck test note') throw new Error('issue_note not saved');
  });

  await check('reset machine to available for queue test', async () => {
    const r = await fetch(`${BASE}/api/machines/${machineId}/report`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ reportType: 'start' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  let queueId = '';
  await check('join queue', async () => {
    const r = await fetch(`${BASE}/api/queues`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ machineId }),
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    const data: any = await r.json();
    queueId = data.id;
  });

  await check('get my queues', async () => {
    const r = await fetch(`${BASE}/api/queues/me`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const rows: any[] = await r.json();
    if (rows.length === 0) throw new Error('queue not reflected in /queues/me');
  });

  await check('leave queue', async () => {
    const r = await fetch(`${BASE}/api/queues/${queueId}`, { method: 'DELETE', headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  await check('toggle favorite on', async () => {
    const r = await fetch(`${BASE}/api/favorites`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ machineId }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!data.favorited) throw new Error('did not favorite');
  });

  await check('favorites list contains machine', async () => {
    const r = await fetch(`${BASE}/api/favorites`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const rows: any[] = await r.json();
    if (!rows.find((m: any) => m.id === machineId)) throw new Error('machine not in favorites list');
  });

  await check('toggle favorite off', async () => {
    const r = await fetch(`${BASE}/api/favorites`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ machineId }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (data.favorited) throw new Error('did not unfavorite');
  });

  await check('leaderboard responds', async () => {
    const r = await fetch(`${BASE}/api/users/leaderboard`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!Array.isArray(data.colleges) || !Array.isArray(data.users)) throw new Error('malformed response');
  });

  await check('achievements list + first_wash unlocked', async () => {
    const r = await fetch(`${BASE}/api/achievements`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const rows: any[] = await r.json();
    if (rows.length === 0) throw new Error('no achievements seeded');
    const fw = rows.find((a: any) => a.code === 'first_wash');
    if (!fw || !fw.unlocked) throw new Error('first_wash achievement did not unlock after completed cycle');
  });

  await check('notifications list + unread count', async () => {
    const r = await fetch(`${BASE}/api/notifications`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const rows: any[] = await r.json();
    const c = await (await fetch(`${BASE}/api/notifications/unread-count`, { headers: auth() })).json() as any;
    if (typeof c.count !== 'number') throw new Error('bad unread-count response');
    if (rows.length > 0) {
      const r2 = await fetch(`${BASE}/api/notifications/${rows[0].id}/read`, { method: 'POST', headers: auth() });
      if (!r2.ok) throw new Error('mark-read failed');
    }
  });

  await check('mark all notifications read', async () => {
    const r = await fetch(`${BASE}/api/notifications/read-all`, { method: 'POST', headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  await check('stats endpoint', async () => {
    const r = await fetch(`${BASE}/api/stats/me`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!Array.isArray(data.week) || !Array.isArray(data.heatmap)) throw new Error('malformed stats response');
  });

  await check('best-time endpoint', async () => {
    const r = await fetch(`${BASE}/api/stats/best-time`, { headers: auth() });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!data.bestWindow) throw new Error('no bestWindow in response');
  });

  await check('buddy post + list + remove', async () => {
    const post = await fetch(`${BASE}/api/buddies`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ building: 'BK Berkeley', message: 'selfcheck' }),
    });
    if (!post.ok) throw new Error(`post status ${post.status}`);
    const mine = await fetch(`${BASE}/api/buddies/me`, { headers: auth() });
    const mineData: any = await mine.json();
    if (!mineData || mineData.building !== 'BK Berkeley') throw new Error('buddy listing not saved');
    const del = await fetch(`${BASE}/api/buddies/me`, { method: 'DELETE', headers: auth() });
    if (!del.ok) throw new Error(`delete status ${del.status}`);
  });

  await check('feedback submission', async () => {
    const r = await fetch(`${BASE}/api/feedback`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ message: 'selfcheck test' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
  });

  await check('profile update (PATCH /users/me)', async () => {
    const r = await fetch(`${BASE}/api/users/me`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ theme: 'dark' }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (data.theme !== 'dark') throw new Error('theme not persisted');
  });

  await check('status endpoint', async () => {
    const r = await fetch(`${BASE}/api/status`);
    if (!r.ok) throw new Error(`status ${r.status}`);
    const data: any = await r.json();
    if (!data.db || data.db.machines === 0) throw new Error('status reports no seeded machines');
  });

  await check('auth required — rejects missing token', async () => {
    const r = await fetch(`${BASE}/api/users/me`);
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
  });

  await check('auth required — rejects garbage token', async () => {
    const r = await fetch(`${BASE}/api/users/me`, { headers: { Authorization: 'Bearer garbage' } });
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Suds Self-Check: ${passed}/${results.length} passed ===\n`);
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log('');
  if (passed !== results.length) process.exit(1);
}

main().catch((e) => {
  console.error('selfcheck crashed:', e);
  process.exit(1);
});
