import { api } from './api';

const RECENT_KEY = 'sentivest_recent_tickers';
const MAX_RECENT = 8;

export const symbolsApi = {
  search: (q, limit = 8) =>
    api.get('/api/symbols/search', { params: { q, limit } }).then((r) => r.data),
  trending: () => api.get('/api/symbols/trending').then((r) => r.data),
  lookup:  (t) => api.get(`/api/symbols/${encodeURIComponent(t)}`).then((r) => r.data),
};

export const getRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
};

export const pushRecent = (entry) => {
  // entry: { ticker, name }
  if (!entry?.ticker) return;
  const list = getRecent().filter((e) => e.ticker !== entry.ticker);
  list.unshift({ ticker: entry.ticker.toUpperCase(), name: entry.name || entry.ticker });
  const trimmed = list.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
};

export const clearRecent = () => {
  localStorage.removeItem(RECENT_KEY);
};

/** Highlight matched substring of `text` against query `q`. Returns React-ready array. */
export const highlight = (text, q) => {
  if (!q || !text) return [text];
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(re);
  return parts.map((p, i) => (
    re.test(p) ? { match: true, text: p, key: i } : { match: false, text: p, key: i }
  ));
};
