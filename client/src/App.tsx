import { useCallback, useEffect, useState } from 'react';
import { api, tokenStore, Machine, User } from './api';
import { connectSocket } from './socket';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { MachineDetail } from './pages/MachineDetail';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Stats } from './pages/Stats';
import { Achievements } from './pages/Achievements';
import { Buddies } from './pages/Buddies';
import { Settings } from './pages/Settings';
import { History } from './pages/History';
import { Help } from './pages/Help';
import { BottomNav, View } from './components/BottomNav';
import { Toast } from './components/Toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>('home');
  const [selected, setSelected] = useState<Machine | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!tokenStore.get()) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.favorites().then((rows) => setFavorites(new Set(rows.map((r) => r.id))));
    api.unreadCount().then((r) => setUnread(r.count));
    document.documentElement.setAttribute('data-theme', user.theme);
  }, [user, refreshKey]);

  useEffect(() => {
    if (!user) return;
    return connectSocket((msg) => {
      if (msg.type === 'machine_update' || msg.type === 'queue_update') {
        setRefreshKey((k) => k + 1);
      }
    });
  }, [user]);

  const showToast = useCallback((m: string) => setToast(m), []);

  const toggleFavorite = async (machineId: string) => {
    const res = await api.toggleFavorite(machineId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (res.favorited) next.add(machineId);
      else next.delete(machineId);
      return next;
    });
    showToast(res.favorited ? 'Added to favorites ⭐' : 'Removed from favorites');
  };

  const refreshNotifications = async () => {
    const r = await api.unreadCount();
    setUnread(r.count);
  };

  const handleUserUpdate = (u: User) => {
    setUser(u);
    document.documentElement.setAttribute('data-theme', u.theme);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setView('home');
    setSelected(null);
    setFavorites(new Set());
    setUnread(0);
  };

  if (booting) return <div className="empty">Loading…</div>;
  if (!user) return <Login onLogin={handleUserUpdate} />;

  return (
    <>
      {view === 'home' && (
        <Home
          user={user}
          refreshKey={refreshKey}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelectMachine={(m) => {
            setSelected(m);
            setView('machine');
          }}
        />
      )}
      {view === 'machine' && selected && (
        <MachineDetail
          machine={selected}
          user={user}
          isFavorite={favorites.has(selected.id)}
          onToggleFavorite={() => toggleFavorite(selected.id)}
          onBack={() => setView('home')}
          onToast={showToast}
          refreshNotifications={refreshNotifications}
        />
      )}
      {view === 'notifications' && <Notifications refreshKey={refreshKey} onChange={refreshNotifications} />}
      {view === 'stats' && <Stats user={user} refreshKey={refreshKey} />}
      {view === 'achievements' && <Achievements refreshKey={refreshKey} />}
      {view === 'buddies' && <Buddies user={user} onToast={showToast} />}
      {view === 'profile' && (
        <Profile
          user={user}
          refreshKey={refreshKey}
          onNavigate={setView}
          onLogout={logout}
          onToast={showToast}
        />
      )}
      {view === 'settings' && (
        <Settings user={user} onUpdate={handleUserUpdate} onBack={() => setView('profile')} onToast={showToast} />
      )}
      {view === 'history' && <History refreshKey={refreshKey} />}
      {view === 'help' && <Help onToast={showToast} />}

      <BottomNav view={view} onChange={setView} unread={unread} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
