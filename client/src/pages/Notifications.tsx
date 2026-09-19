import { useEffect, useState } from 'react';
import { api } from '../api';

const ICONS: Record<string, string> = {
  queue: '🎯',
  achievement: '🏅',
  cycle: '🫧',
  promo: '📢',
};

type Item = Awaited<ReturnType<typeof api.notifications>>[number];

export function Notifications({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.notifications().then(setItems).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [refreshKey]);

  const markAll = async () => {
    await api.markAllRead();
    await load();
    onChange();
  };

  const markOne = async (id: string) => {
    await api.markRead(id);
    await load();
    onChange();
  };

  const del = async (id: string) => {
    await api.deleteNotification(id);
    await load();
    onChange();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div>
            <h1>Notifications</h1>
            <p>{unread} unread</p>
          </div>
          {unread > 0 && (
            <button className="icon-btn" onClick={markAll} title="Mark all as read">
              ✓
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
              <div className="icon">{ICONS[n.type] || '🔔'}</div>
              <div className="body" onClick={() => !n.read && markOne(n.id)}>
                <div className="title">{n.title}</div>
                <div className="msg">{n.body}</div>
                <div className="time">{Math.round((Date.now() - n.created_at) / 60000)}m ago</div>
              </div>
              <button className="del" onClick={() => del(n.id)} aria-label="Delete">
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
