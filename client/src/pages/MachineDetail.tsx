import { useEffect, useState } from 'react';
import { api, Machine, User } from '../api';
import { StatusBadge } from '../components/StatusBadge';

function formatTime(ms: number) {
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  return `${Math.round(mins / 60)} hr`;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Detail = Awaited<ReturnType<typeof api.machine>>;

export function MachineDetail({
  machine,
  user,
  isFavorite,
  onToggleFavorite,
  onBack,
  onToast,
  refreshNotifications,
}: {
  machine: Machine;
  user: User;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
  onToast: (m: string) => void;
  refreshNotifications: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [issueNote, setIssueNote] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = () => api.machine(machine.id).then(setData);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [machine.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const report = async (type: string, note?: string) => {
    setBusy(true);
    try {
      await api.report(machine.id, type, note);
      await load();
      refreshNotifications();
      onToast(
        type === 'start'
          ? 'Cycle started! 🫧'
          : type === 'done'
          ? '+10 points! 🎉'
          : type === 'available'
          ? '+5 points! 🌱'
          : 'Issue reported.'
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const joinQueue = async () => {
    setBusy(true);
    try {
      await api.joinQueue(machine.id);
      await load();
      refreshNotifications();
      onToast('Joined queue 🎯');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const leaveQueue = async (id: string) => {
    setBusy(true);
    try {
      await api.leaveQueue(id);
      await load();
      onToast('Left queue');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const submitIssue = async () => {
    if (!issueNote.trim()) return;
    await report('issue', issueNote.trim());
    setShowIssue(false);
    setIssueNote('');
  };

  const m = data?.machine ?? machine;
  const prediction = data?.prediction;
  const queue = data?.queue ?? [];
  const reports = data?.reports ?? [];
  const activeCycle = data?.activeCycle;
  const myQueue = queue.find((q) => q.user_id === user.id);
  const minutesAway = prediction ? prediction.predicted_available_at - now : 0;
  const cycleRemaining = activeCycle ? activeCycle.expected_end_at - now : 0;

  return (
    <div className="detail">
      <button className="back-btn" onClick={onBack}>
        ← Back
      </button>

      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>{m.label}</h2>
            <div className="sub">
              {m.building} · Floor {m.floor} · {m.machine_type}
            </div>
          </div>
          <button
            className={`fav-btn ${isFavorite ? 'active' : ''}`}
            style={{ position: 'static', fontSize: 22 }}
            onClick={onToggleFavorite}
            aria-label="Toggle favorite"
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        </div>

        <StatusBadge status={m.status} big />

        {m.status === 'out_of_order' && m.issue_note && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 13,
            }}
          >
            ⚠️ {m.issue_note}
          </div>
        )}

        {activeCycle && cycleRemaining > 0 && (
          <div className="prediction" style={{ marginTop: 16 }}>
            <div className="label">Cycle in progress</div>
            <div className="countdown">{formatCountdown(cycleRemaining)}</div>
            <div className="conf">Started {Math.round((now - activeCycle.started_at) / 60000)}m ago</div>
          </div>
        )}

        {prediction && m.status !== 'available' && !activeCycle && (
          <div className="prediction" style={{ marginTop: 16 }}>
            <div className="label">Predicted available</div>
            <div className="value">{formatTime(minutesAway)}</div>
            <div className="conf">{Math.round(prediction.confidence * 100)}% confidence</div>
          </div>
        )}

        <div className="actions">
          <button className="btn btn-success" disabled={busy} onClick={() => report('start')}>
            Start
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => report('done')}>
            Done
          </button>
          <button className="btn btn-secondary" disabled={busy} onClick={() => report('available')}>
            Available
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={() => setShowIssue(true)}>
            Report Issue
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {myQueue ? (
            <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => leaveQueue(myQueue.id)}>
              Leave Queue (#{myQueue.position})
            </button>
          ) : (
            <button
              className="btn btn-primary btn-block"
              disabled={busy || m.status === 'available'}
              onClick={joinQueue}
            >
              {m.status === 'available' ? 'Machine is Free' : 'Join Queue'}
            </button>
          )}
        </div>
      </div>

      {queue.length > 0 && (
        <div className="detail-card">
          <h3>Queue</h3>
          <ul className="queue-list">
            {queue.map((q) => (
              <li key={q.id}>
                <span>
                  <span className="pos">#{q.position}</span>
                  {q.name}
                  {q.user_id === user.id && ' (you)'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{q.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports.length > 0 && (
        <div className="detail-card">
          <h3>Recent activity</h3>
          <ul className="report-list">
            {reports.map((r) => (
              <li key={r.id}>
                <strong>{r.name}</strong> marked <em>{r.report_type}</em> ·{' '}
                {Math.round((now - r.created_at) / 60000)}m ago
                {r.note && <div style={{ marginTop: 4, fontStyle: 'italic' }}>“{r.note}”</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showIssue && (
        <div className="modal-backdrop" onClick={() => setShowIssue(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report an issue</h3>
            <textarea
              className="note-input"
              placeholder="What's wrong with this machine?"
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              autoFocus
            />
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setShowIssue(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={submitIssue} disabled={!issueNote.trim()}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
