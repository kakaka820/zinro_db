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
const del  = (path)       => fetch(`${BASE}${path}`, {
  method: 'DELETE',
}).then(r => r.json());

export const api = { get, post, put, del };
