import type { Player, Role, Game, Participant, Vote,
   Execution, NightKill, CoEvent, SeerResult, MediumResult, KnightGuard
 } from './types'


const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const get = <T>(path: string): Promise<T> =>
   fetch(`${BASE}${path}`).then(r => r.json());
 const post = <T>(path: string, body: unknown): Promise<T> =>
   fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
 const put = <T>(path: string, body: unknown): Promise<T> =>
   fetch(`${BASE}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
 const del = <T>(path: string, body?: unknown): Promise<T> =>
   fetch(`${BASE}${path}`, { method: 'DELETE', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export const api = { get, post, put, del };


// CO関連
export const coEventsApi = {
  list: (gameId: number) => api.get<CoEvent[]>(`/co-events/game/${gameId}`),
   add: (body: Omit<CoEvent, 'id' | 'player_name' | 'claimed_role_name'>) =>
     api.post<CoEvent>('/co-events', body),
   update: (id: number, body: Partial<CoEvent>) =>
     api.put<CoEvent>(`/co-events/${id}`, body),
   del: (id: number) => api.del<{ success: boolean }>(`/co-events/${id}`),
};

export const seerResultsApi = {
  list:   (gameId: number) => api.get<SeerResult[]>(`/seer-results/game/${gameId}`),
  add:    (body: Omit<SeerResult, 'id' | 'seer_name' | 'target_name'>) => api.post<SeerResult>('/seer-results', body),
  update: (id: number, body: Partial<SeerResult>) => api.put<SeerResult>(`/seer-results/${id}`, body),
  del:    (id: number) => api.del<{ success: boolean }>(`/seer-results/${id}`),
};

export const mediumResultsApi = {
  list:   (gameId) => api.get(`/medium-results/game/${gameId}`),
  add:    (body)   => api.post('/medium-results', body),
  update: (id, body) => api.put(`/medium-results/${id}`, body),
  del:    (id)     => api.del(`/medium-results/${id}`),
};

export const knightGuardsApi = {
  list:   (gameId) => api.get(`/knight-guards/game/${gameId}`),
  add:    (body)   => api.post('/knight-guards', body),
  update: (id, body) => api.put(`/knight-guards/${id}`, body),
  del:    (id)     => api.del(`/knight-guards/${id}`),
};
