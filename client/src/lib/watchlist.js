const KEY = 'sentivest_watchlist';

export const getWatchlist = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
};

export const setWatchlist = (list) => {
  localStorage.setItem(KEY, JSON.stringify(list));
};

export const addToWatchlist = (ticker) => {
  const t = ticker.toUpperCase();
  const list = getWatchlist();
  if (!list.includes(t)) {
    list.unshift(t);
    setWatchlist(list);
  }
  return list;
};

export const removeFromWatchlist = (ticker) => {
  const t = ticker.toUpperCase();
  const list = getWatchlist().filter((x) => x !== t);
  setWatchlist(list);
  return list;
};

export const inWatchlist = (ticker) => getWatchlist().includes(ticker.toUpperCase());
