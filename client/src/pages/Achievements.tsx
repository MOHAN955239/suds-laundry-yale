import { useEffect, useState } from 'react';
import { api } from '../api';

type Item = Awaited<ReturnType<typeof api.achievements>>[number];

export function Achievements({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    api.achievements().then(setItems);
  }, [refreshKey]);

  const unlocked = items.filter((a) => a.unlocked).length;

  return (
    <>
      <div className="header">
        <h1>Achievements 🏅</h1>
        <p>
          {unlocked} / {items.length} unlocked
        </p>
      </div>
      <div style={{ padding: 16 }}>
        {items.map((a) => (
          <div key={a.id} className={`achievement ${a.unlocked ? 'unlocked' : 'locked'}`}>
            <div className="icon">{a.icon}</div>
            <div className="info">
              <div className="name">{a.name}</div>
              <div className="desc">{a.description}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
