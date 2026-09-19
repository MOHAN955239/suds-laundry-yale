import { useState } from 'react';
import { api, tokenStore, User } from '../api';

const COLLEGES = ['BK','BR','DC','ES','JE','MC','PC','SY','SM','TD','TC','BF','PM'];

export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('BK');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !name) return;
    setBusy(true);
    try {
      const { user, token } = await api.login(email, name, college);
      tokenStore.set(token);
      onLogin(user);
    } catch (err: any) {
      setError(err.message?.includes('Yale') ? 'Use your @yale.edu email.' : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="login" onSubmit={submit}>
      <h1>Suds 🧺</h1>
      <p>Sign in with your Yale email.</p>
      {error && <div className="error">{error}</div>}
      <input type="email" placeholder="you@yale.edu" value={email}
        onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <input placeholder="Your name" value={name}
        onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      <select value={college} onChange={(e) => setCollege(e.target.value)}>
        {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}
