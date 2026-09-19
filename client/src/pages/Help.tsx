import { useState } from 'react';
import { api } from '../api';

const FAQ = [
  {
    q: 'How does Suds know if a machine is free?',
    a: 'Students report machine status with one tap. Combined with our prediction model, that gives a live picture of every laundry room on campus.',
  },
  {
    q: 'Do I need to be at the machine to join a queue?',
    a: "No — join from anywhere. You'll get a notification when the machine is ready for you.",
  },
  {
    q: 'How is my Suds Score calculated?',
    a: '+10 for completing a cycle, +5 for marking a machine available, plus bonuses for sustainable habits.',
  },
  {
    q: 'What if a machine is broken?',
    a: 'Tap "Report Issue" and add a note. Other students will see the warning right away.',
  },
  {
    q: 'Can I favorite machines?',
    a: 'Yes — tap the ⭐ on any machine card to pin it for quick access.',
  },
];

export function Help({ onToast }: { onToast: (m: string) => void }) {
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await api.sendFeedback(message.trim());
      setMessage('');
      onToast('Thanks for the feedback! 💬');
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="header">
        <h1>Help ❓</h1>
        <p>FAQ & feedback</p>
      </div>
      <div style={{ padding: 16 }}>
        <div className="section-title">Frequently asked</div>
        <div className="detail-card">
          {FAQ.map((f, i) => (
            <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '12px 0',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                {f.q}
                <span>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 12, fontSize: 13, color: 'var(--muted)' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="section-title">Send feedback</div>
        <div className="detail-card">
          <textarea
            className="note-input"
            placeholder="Tell us what you think…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 12 }}
            onClick={send}
            disabled={busy || !message.trim()}
          >
            {busy ? 'Sending…' : 'Send feedback'}
          </button>
        </div>
      </div>
    </>
  );
}
