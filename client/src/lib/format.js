export const formatMoney = (value, opts = {}) => {
  const { decimals = 2, compact = false } = opts;
  const n = Number(value || 0);
  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCurrency = (value, opts = {}) => `$${formatMoney(value, opts)}`;

export const formatPercent = (value, decimals = 2) => {
  const n = Number(value || 0);
  return `${n >= 0 ? '' : ''}${n.toFixed(decimals)}%`;
};

export const formatSignedPercent = (value, decimals = 2) => {
  const n = Number(value || 0);
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
};

export const formatSignedCurrency = (value, opts = {}) => {
  const n = Number(value || 0);
  return `${n >= 0 ? '+' : '−'}$${formatMoney(Math.abs(n), opts)}`;
};

export const formatCompact = (value) => {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now() / 1000;
  const ts = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  const diff = now - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const cx = (...classes) => classes.filter(Boolean).join(' ');
