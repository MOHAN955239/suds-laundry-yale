import { useEffect, useState } from 'react';
import { api, User } from '../api';

type Listing = Awaited<ReturnType<typeof api.buddies>>[number];
type Mine = Awaited<ReturnType<typeof api.myBuddyListing>>;

export function Buddies({ user, onToast }: { user: User; onToast: (m: string) => void }) {
  const [list, setList] = useState<Listing[]>([]);
  const [mine, setMine] = useState<Mine>(null);
  const [building, setBuilding] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [buildings, setBuildings] = useState<string[]>([]);

  const load = async () => {
    setList(await api.buddies());
    setMine(await api.myBuddyListing());
  };

  useEffect(() => {
    api.buildings().then((b) => {
      setBuildings(b);
      setBuilding((prev) => prev || b[0] || '');
    });
    load();
  }, []);

  const post = async () => {
    if (!building) return;
    setBusy(true);
    try {
      await api.createBuddy(building, message || undefined);
      setMessage('');
      await load();
      onToast('Posted! 🤝');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.removeBuddy();
      await load();
      onToast('Removed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="header">
        <h1>Laundry Buddy 🤝</h1>
        <p>Find floor mates doing laundry now</p>
      </div>

      <div style={{ padding: 16 }}>
        {mine ? (
          <div className="detail-card">
            <h3>Your listing</h3>
            <div className="sub">{mine.building}</div>
            {mine.message && <div style={{ fontSize: 13, marginBottom: 10 }}>“{mine.message}”</div>}
            <button className="btn btn-danger btn-block" onClick={remove} disabled={busy}>
              Remove listing
            </button>
          </div>
        ) : (
          <div className="detail-card">
            <h3>Post your availability</h3>
            <select
              className="search-input"
              style={{ marginBottom: 8 }}
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <input
              className="search-input"
              placeholder="Optional message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={post} disabled={busy}>
              Post listing
            </button>
          </div>
        )}

        <div className="section-title">Available now — {user.college || 'Yale'}</div>
        {list.length === 0 ? (
          <div className="empty">No one yet. Be the first!</div>
        ) : (
          list.map((b) => (
            <div key={b.id} className="buddy-card">
              <div className="name">
                {b.name}
                {b.college && <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {b.college}</span>}
              </div>
              <div className="building">{b.building}</div>
              {b.message && <div className="message">{b.message}</div>}
            </div>
          ))
        )}
      </div>
    </>
  );
}
