import { useEffect, useState } from 'react';
import { api, User } from '../api';
import type { View } from '../components/BottomNav';

type Leaderboard = Awaited<ReturnType<typeof api.leaderboard>>;
type Queues = Awaited<ReturnType<typeof api.myQueues>>;

const NAV_ROWS: Array<{ view: View; label: string; sub: string }> = [
  { view: 'achievements', label: '🏅 Achievements', sub: 'View your badges' },
  { view: 'history', label: '📜 History', sub: 'Your past cycles & reports' },
  { view: 'settings', label: '⚙️ Settings', sub: 'Theme, notifications' },
  { view: 'help', label: '❓ Help & Feedback', sub: 'FAQ, contact us' },
];

export function Profile({
  user,
  refreshKey,
  onNavigate,
  onLogout,
  onToast,
}: {
  user: User;
  refreshKey: number;
  onNavigate: (v: View) => void;
  onLogout: () => void;
  onToast: (m: string) => void;
}) {
  const [lb, setLb] = useState<Leaderboard | null>(null);
  const [queues, setQueues] = useState<Queues>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [college, setCollege] = useState(user.college || '');

  useEffect(() => {
    api.leaderboard().then(setLb);
    api.myQueues().then(setQueues);
  }, [refreshKey]);

  const save = async () => {
    try {
      await api.updateMe({ name, college });
      onToast('Saved ✓');
      setEditing(false);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <>
      <div className="header">
        <h1>Profile 👤</h1>
        <p>{user.email}</p>
      </div>

      <div style={{ padding: 16 }}>
        <div className="detail-card">
          {editing ? (
            <>
              <input
                className="search-input"
                style={{ marginBottom: 8 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
              <input
                className="search-input"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="College code (BK, TD, …)"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={save}>
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 18 }}>{user.name}</h2>
                  <div className="sub">{user.college || 'Yale'}</div>
                </div>
                <button
                  className="icon-btn"
                  style={{ background: 'var(--bg)', color: 'var(--text)' }}
                  onClick={() => setEditing(true)}
                  aria-label="Edit profile"
                >
                  ✏️
                </button>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--yale-light)' }}>{user.suds_score}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Suds Score</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--yale-light)' }}>{user.streak}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Streak</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="detail-card" style={{ padding: 0 }}>
          {NAV_ROWS.map((row, i) => (
            <button
              key={row.view}
              className="settings-row"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                borderBottom: i < NAV_ROWS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onClick={() => onNavigate(row.view)}
            >
              <div>
                <div className="label">{row.label}</div>
                <div className="sub">{row.sub}</div>
              </div>
              <span>›</span>
            </button>
          ))}
        </div>

        {queues.length > 0 && (
          <>
            <div className="section-title">Your Queues</div>
            <div className="detail-card">
              {queues.map((q) => (
                <div key={q.id} className="lb-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {q.label} · {q.building.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Position #{q.position} · {q.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {lb && (
          <>
            <div className="section-title">College Leaderboard</div>
            <div className="detail-card">
              {lb.colleges.length === 0 ? (
                <div className="empty">No scores yet.</div>
              ) : (
                lb.colleges.map((row, i) => (
                  <div key={row.college} className="lb-row">
                    <span className="rank">#{i + 1}</span>
                    <span className="name">{row.college}</span>
                    <span className="score">{row.total}</span>
                  </div>
                ))
              )}
            </div>

            <div className="section-title">Top Users</div>
            <div className="detail-card">
              {lb.users.map((u, i) => (
                <div key={i} className="lb-row">
                  <span className="rank">#{i + 1}</span>
                  <span className="name">
                    {u.name}
                    {u.college && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {u.college}</span>}
                  </span>
                  <span className="score">{u.suds_score}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn btn-danger btn-block" style={{ marginTop: 20 }} onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </>
  );
}
