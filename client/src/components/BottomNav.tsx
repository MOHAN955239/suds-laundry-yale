export type View =
  | 'home' | 'machine' | 'profile' | 'notifications' | 'achievements'
  | 'stats' | 'buddies' | 'settings' | 'history' | 'help';

export function BottomNav({
  view,
  onChange,
  unread,
}: {
  view: View;
  onChange: (v: View) => void;
  unread: number;
}) {
  const isHome = view === 'home' || view === 'machine';
  const isStats = view === 'stats' || view === 'achievements' || view === 'history';
  const isProfile = view === 'profile' || view === 'settings' || view === 'help';

  return (
    <nav className="nav">
      <button className={isHome ? 'active' : ''} onClick={() => onChange('home')}>
        <span className="icon">🧺</span>
        Laundry
      </button>
      <button className={isStats ? 'active' : ''} onClick={() => onChange('stats')}>
        <span className="icon">📊</span>
        Stats
      </button>
      <button className={view === 'buddies' ? 'active' : ''} onClick={() => onChange('buddies')}>
        <span className="icon">🤝</span>
        Buddy
      </button>
      <button className={view === 'notifications' ? 'active' : ''} onClick={() => onChange('notifications')}>
        <span className="icon" style={{ position: 'relative' }}>
          🔔
          {unread > 0 && <span className="badge-dot" style={{ top: -4, right: -6 }}>{unread > 9 ? '9+' : unread}</span>}
        </span>
        Alerts
      </button>
      <button className={isProfile ? 'active' : ''} onClick={() => onChange('profile')}>
        <span className="icon">👤</span>
        Profile
      </button>
    </nav>
  );
}
