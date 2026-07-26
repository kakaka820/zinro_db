const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const get  = (path)       => fetch(`${BASE}${path}`).then(r => r.json());
const post = (path, body) => fetch(`${BASE}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(r => r.json());
const put  = (path, body) => fetch(`${BASE}${path}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(r => r.json());
const del  = (path, body) => fetch(`${BASE}${path}`, {
  method: 'DELETE',
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
}).then(r => r.json());

export const api = { get, post, put, del };


// CO関連
export const coEventsApi = {
  list:   (gameId)   => api.get(`/co-events/game/${gameId}`),
  add:    (body)     => api.post('/co-events', body),
  update: (id, body) => api.put(`/co-events/${id}`, body),
  del:    (id)       => api.del(`/co-events/${id}`),
};

export const seerResultsApi = {
  list:   (gameId) => api.get(`/seer-results/game/${gameId}`),
  add:    (body)   => api.post('/seer-results', body),
  update: (id, body) => api.put(`/seer-results/${id}`, body),
  del:    (id)     => api.del(`/seer-results/${id}`),
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
