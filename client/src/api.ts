export const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'suds_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export type Machine = {
  id: string;
  building: string;
  floor: number;
  machine_type: 'washer' | 'dryer';
  label: string;
  status: 'available' | 'in_use' | 'almost_done' | 'out_of_order' | 'reserved';
  last_reported_at: number | null;
  confidence: number;
  issue_note: string | null;
};

export type User = {
  id: string;
  email: string;
  name: string;
  college: string | null;
  suds_score: number;
  streak: number;
  theme: 'light' | 'dark';
  notify_cycle: number;
  notify_queue: number;
  notify_promo: number;
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    tokenStore.clear();
    window.location.reload();
    throw new Error('session expired');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export const api = {
  login: (email: string, name: string, college: string) =>
    req<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, name, college }),
    }),

  me: () => req<User>('/api/users/me'),

  updateMe: (updates: Partial<User>) =>
    req<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(updates) }),

  leaderboard: () =>
    req<{
      colleges: Array<{ college: string; total: number; members: number }>;
      users: Array<{ name: string; college: string | null; suds_score: number }>;
    }>('/api/users/leaderboard'),

  history: () =>
    req<{
      reports: Array<{ id: string; report_type: string; note: string | null; created_at: number; label: string; building: string }>;
      cycles: Array<{ id: string; started_at: number; completed_at: number | null; label: string; building: string; cycle_type: string }>;
    }>('/api/users/history'),

  buildings: () => req<string[]>('/api/machines/buildings'),

  machines: (params?: { building?: string; type?: string; sort?: string }) => {
    const q = new URLSearchParams();
    if (params?.building) q.set('building', params.building);
    if (params?.type) q.set('type', params.type);
    if (params?.sort) q.set('sort', params.sort);
    const qs = q.toString();
    return req<Machine[]>(`/api/machines${qs ? `?${qs}` : ''}`);
  },

  search: (q: string) => req<Machine[]>(`/api/machines/search?q=${encodeURIComponent(q)}`),

  machine: (id: string) =>
    req<{
      machine: Machine;
      prediction: { predicted_available_at: number; confidence: number };
      queue: Array<{ id: string; user_id: string; name: string; position: number; status: string }>;
      reports: Array<{ id: string; report_type: string; note: string | null; name: string; created_at: number }>;
      activeCycle: { id: string; started_at: number; expected_end_at: number } | null;
    }>(`/api/machines/${id}`),

  report: (machineId: string, reportType: string, note?: string) =>
    req<{ ok: boolean; machine: Machine }>(`/api/machines/${machineId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reportType, note }),
    }),

  joinQueue: (machineId: string) =>
    req('/api/queues', { method: 'POST', body: JSON.stringify({ machineId }) }),

  leaveQueue: (id: string) => req(`/api/queues/${id}`, { method: 'DELETE' }),

  myQueues: () =>
    req<Array<{
      id: string; machine_id: string; position: number; status: string;
      building: string; floor: number; label: string; machine_type: string;
    }>>('/api/queues/me'),

  favorites: () => req<Machine[]>('/api/favorites'),

  toggleFavorite: (machineId: string) =>
    req<{ favorited: boolean }>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ machineId }),
    }),

  notifications: () =>
    req<Array<{ id: string; type: string; title: string; body: string; machine_id: string | null; read: number; created_at: number }>>('/api/notifications'),

  unreadCount: () => req<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => req(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => req('/api/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => req(`/api/notifications/${id}`, { method: 'DELETE' }),

  achievements: () =>
    req<Array<{ id: string; code: string; name: string; description: string; icon: string; unlocked: boolean; unlocked_at: number | null }>>('/api/achievements'),

  stats: () =>
    req<{
      cycles: number; active: number; reports: number; available: number;
      week: Array<{ day: string; count: number }>;
      heatmap: Array<{ hour: number; count: number }>;
    }>('/api/stats/me'),

  bestTime: (building?: string) =>
    req<{ heatmap: Array<{ hour: number; count: number }>; bestWindow: { start: number; end: number } }>(
      `/api/stats/best-time${building ? `?building=${encodeURIComponent(building)}` : ''}`
    ),

  buddies: (building?: string) =>
    req<Array<{ id: string; user_id: string; name: string; college: string | null; building: string; message: string | null; created_at: number }>>(
      `/api/buddies${building ? `?building=${encodeURIComponent(building)}` : ''}`
    ),

  myBuddyListing: () =>
    req<{ id: string; building: string; message: string | null } | null>('/api/buddies/me'),

  createBuddy: (building: string, message?: string) =>
    req('/api/buddies', { method: 'POST', body: JSON.stringify({ building, message }) }),

  removeBuddy: () => req('/api/buddies/me', { method: 'DELETE' }),

  sendFeedback: (message: string) =>
    req('/api/feedback', { method: 'POST', body: JSON.stringify({ message }) }),
};
