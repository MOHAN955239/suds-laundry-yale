import { useEffect, useState } from 'react';
import { api } from '../api';

type HistoryData = Awaited<ReturnType<typeof api.history>>;

export function History({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [tab, setTab] = useState<'cycles' | 'reports'>('cycles');

  useEffect(() => {
    api.history().then(setData);
  }, [refreshKey]);

  if (!data) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="header">
        <h1>History 📜</h1>
        <p>Your past activity</p>
      </div>
      <div style={{ padding: 16 }}>
        <div className="filters" style={{ padding: '0 0 12px' }}>
          <button className={`chip ${tab === 'cycles' ? 'active' : ''}`} onClick={() => setTab('cycles')}>
            Cycles ({data.cycles.length})
          </button>
          <button className={`chip ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
            Reports ({data.reports.length})
          </button>
        </div>

        {tab === 'cycles' ? (
          data.cycles.length === 0 ? (
            <div className="empty">No cycles yet.</div>
          ) : (
            <div className="detail-card">
              {data.cycles.map((item) => (
                <div key={item.id} className="lb-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {item.label} · {item.building.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(item.started_at).toLocaleString()} ·{' '}
                      {item.completed_at ? '✓ completed' : 'in progress'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : data.reports.length === 0 ? (
          <div className="empty">No reports yet.</div>
        ) : (
          <div className="detail-card">
            {data.reports.map((item) => (
              <div key={item.id} className="lb-row">
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {item.label} · {item.building.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {item.report_type} · {new Date(item.created_at).toLocaleString()}
                  </div>
                  {item.note && (
                    <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>“{item.note}”</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
