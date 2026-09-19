import { useState } from 'react';
import { api, User } from '../api';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} />;
}

export function Settings({
  user,
  onUpdate,
  onBack,
  onToast,
}: {
  user: User;
  onUpdate: (u: User) => void;
  onBack: () => void;
  onToast: (m: string) => void;
}) {
  const [theme, setTheme] = useState(user.theme);
  const [notifyCycle, setNotifyCycle] = useState(!!user.notify_cycle);
  const [notifyQueue, setNotifyQueue] = useState(!!user.notify_queue);
  const [notifyPromo, setNotifyPromo] = useState(!!user.notify_promo);

  const update = async (patch: Record<string, unknown>) => {
    try {
      const u = await api.updateMe(patch);
      onUpdate(u);
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div>
            <h1>Settings ⚙️</h1>
            <p>Preferences</p>
          </div>
          <button className="icon-btn" onClick={onBack}>
            ←
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div className="detail-card">
          <div className="settings-row">
            <div>
              <div className="label">Dark mode</div>
              <div className="sub">Easier on the eyes</div>
            </div>
            <Toggle
              on={theme === 'dark'}
              onClick={() => {
                const next = theme === 'light' ? 'dark' : 'light';
                setTheme(next);
                update({ theme: next });
              }}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Cycle notifications</div>
              <div className="sub">When your laundry is done</div>
            </div>
            <Toggle
              on={notifyCycle}
              onClick={() => {
                const v = !notifyCycle;
                setNotifyCycle(v);
                update({ notify_cycle: v });
              }}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Queue notifications</div>
              <div className="sub">When it's your turn</div>
            </div>
            <Toggle
              on={notifyQueue}
              onClick={() => {
                const v = !notifyQueue;
                setNotifyQueue(v);
                update({ notify_queue: v });
              }}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="label">Product updates</div>
              <div className="sub">Occasional news</div>
            </div>
            <Toggle
              on={notifyPromo}
              onClick={() => {
                const v = !notifyPromo;
                setNotifyPromo(v);
                update({ notify_promo: v });
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
