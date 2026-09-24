const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'tg_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let msg = data?.detail;
    if (Array.isArray(msg)) msg = msg.map((d) => d.msg.replace(/^Value error, /, '')).join(', ');
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return data;
}

export const inr = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v));

/** Upload a configured AR model (GLB or USDZ); returns an absolute HTTPS URL native AR apps can open. */
export async function uploadARModel(blob, fmt) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/ar/models?fmt=${fmt}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => null))?.detail || 'Upload failed');
  const { url } = await res.json();
  return new URL(url, new URL(BASE, window.location.origin)).href; // works for same-origin and separate API hosts
}
