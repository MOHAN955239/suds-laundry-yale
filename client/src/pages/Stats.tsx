import { useEffect, useState } from 'react';
import { api, User } from '../api';

type StatsData = Awaited<ReturnType<typeof api.stats>>;
type BestData = Awaited<ReturnType<typeof api.bestTime>>;

export function Stats({ user, refreshKey }: { user: User; refreshKey: number }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [best, setBest] = useState<BestData | null>(null);

  useEffect(() => {
    api.stats().then(setStats);
    api.bestTime().then(setBest);
  }, [refreshKey]);

  if (!stats) return <div className="empty">Loading stats…</div>;

  const maxWeek = Math.max(1, ...stats.week.map((d) => d.count));
  const maxHeat = best ? Math.max(1, ...best.heatmap.map((h) => h.count)) : 1;

  return (
    <>
      <div className="header">
        <h1>Your Stats 📊</h1>
        <p>{user.name}</p>
      </div>

      <div style={{ padding: 16 }}>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="num">{stats.cycles}</div>
            <div className="lbl">Cycles</div>
          </div>
          <div className="stat-box">
            <div className="num">{stats.active}</div>
            <div className="lbl">Active</div>
          </div>
          <div className="stat-box">
            <div className="num">{stats.reports}</div>
            <div className="lbl">Reports</div>
          </div>
          <div className="stat-box">
            <div className="num">{stats.available}</div>
            <div className="lbl">Marked Free</div>
          </div>
        </div>

        <div className="section-title">Last 7 days</div>
        <div className="detail-card">
          <div className="bar-chart">
            {stats.week.map((d, i) => (
              <div key={i} className="bar" style={{ height: `${(d.count / maxWeek) * 100}%` }}>
                <span className="bar-label">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {best && (
          <>
            <div className="section-title">Best time to wash</div>
            <div className="detail-card">
              <p style={{ fontSize: 14, marginBottom: 10 }}>
                🕐 Quietest window:{' '}
                <strong>
                  {String(best.bestWindow.start).padStart(2, '0')}:00 –{' '}
                  {String(best.bestWindow.end).padStart(2, '0')}:00
                </strong>
              </p>
              <div className="heatmap">
                {best.heatmap.map((h) => {
                  const intensity = h.count / maxHeat;
                  return (
                    <div
                      key={h.hour}
                      className="heat-cell"
                      title={`${h.hour}:00 — ${h.count} cycles`}
                      style={{
                        background:
                          intensity === 0 ? 'var(--border)' : `rgba(74, 144, 217, ${0.2 + intensity * 0.8})`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="heat-legend">
                <span>12am</span>
                <div style={{ flex: 1 }} />
                <span>12pm</span>
                <div style={{ flex: 1 }} />
                <span>11pm</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
