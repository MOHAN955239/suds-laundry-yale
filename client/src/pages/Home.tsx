import { useEffect, useState } from 'react';
import { api, Machine, User } from '../api';
import { MachineCard } from '../components/MachineCard';
import { Legend } from '../components/Legend';

export function Home({
  user,
  refreshKey,
  onSelectMachine,
  favorites,
  onToggleFavorite,
}: {
  user: User;
  refreshKey: number;
  onSelectMachine: (m: Machine) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const [buildings, setBuildings] = useState<string[]>([]);
  const [building, setBuilding] = useState('');
  const [type, setType] = useState<'all' | 'washer' | 'dryer'>('all');
  const [sort, setSort] = useState<'label' | 'floor' | 'status'>('label');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Machine[] | null>(null);

  useEffect(() => {
    api.buildings().then((b) => {
      setBuildings(b);
      setBuilding((prev) => prev || b[0] || '');
    });
  }, []);

  useEffect(() => {
    if (!building) return;
    setLoading(true);
    api
      .machines({ building, type: type === 'all' ? undefined : type, sort })
      .then(setMachines)
      .finally(() => setLoading(false));
  }, [building, type, sort, refreshKey]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.search(search).then(setSearchResults);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const display = searchResults ?? machines;

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div>
            <h1>Suds 🧺</h1>
            <p>
              Hi {user.name.split(' ')[0]} · {user.college || 'Yale'}
            </p>
          </div>
          <div className="score-pill">🌱 {user.suds_score}</div>
        </div>
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          placeholder="Search machines or buildings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!search && (
        <>
          <div className="filters">
            {buildings.map((b) => (
              <button
                key={b}
                className={`chip ${b === building ? 'active' : ''}`}
                onClick={() => setBuilding(b)}
              >
                {b.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="sort-row">
            <button className={`chip ${type === 'all' ? 'active' : ''}`} onClick={() => setType('all')}>
              All
            </button>
            <button className={`chip ${type === 'washer' ? 'active' : ''}`} onClick={() => setType('washer')}>
              Washers
            </button>
            <button className={`chip ${type === 'dryer' ? 'active' : ''}`} onClick={() => setType('dryer')}>
              Dryers
            </button>
            <select value={sort} onChange={(e) => setSort(e.target.value as 'label' | 'floor' | 'status')}>
              <option value="label">Sort: Label</option>
              <option value="floor">Sort: Floor</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          <Legend />
        </>
      )}

      {loading ? (
        <div className="empty">Loading machines…</div>
      ) : display.length === 0 ? (
        <div className="empty">{search ? 'No matches.' : 'No machines found.'}</div>
      ) : (
        <div className="grid">
          {display.map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              isFavorite={favorites.has(m.id)}
              onToggleFavorite={() => onToggleFavorite(m.id)}
              onClick={() => onSelectMachine(m)}
            />
          ))}
        </div>
      )}
    </>
  );
}
