import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, LayoutDashboard, Briefcase, Star, User, TrendingUp,
} from 'lucide-react';
import { cx } from '../../lib/format';
import { symbolsApi, getRecent, pushRecent } from '../../lib/symbols';

const NAV_ROUTES = [
  { type: 'nav', label: 'Dashboard',  to: '/dashboard', icon: LayoutDashboard, hint: 'Go to' },
  { type: 'nav', label: 'Discover',   to: '/search',    icon: Search, hint: 'Go to' },
  { type: 'nav', label: 'Portfolio',  to: '/portfolio', icon: Briefcase, hint: 'Go to' },
  { type: 'nav', label: 'Watchlist',  to: '/watchlist', icon: Star, hint: 'Go to' },
  { type: 'nav', label: 'Profile',    to: '/profile',   icon: User, hint: 'Go to' },
];

export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  const [tickers, setTickers] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState(getRecent());
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(0);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    setRecent(getRecent());
    setTimeout(() => inputRef.current?.focus(), 10);
    symbolsApi.trending().then((d) => setTrending(d.results || [])).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setTickers([]);
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    const myReq = ++reqIdRef.current;
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      symbolsApi.search(q, 8)
        .then((d) => { if (reqIdRef.current === myReq) setTickers(d.results || []); })
        .catch(() => { if (reqIdRef.current === myReq) setTickers([]); })
        .finally(() => { if (reqIdRef.current === myReq) setLoading(false); });
    }, 140);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Merge navigation + tickers
  const items = useMemo(() => {
    const navFiltered = q.trim()
      ? NAV_ROUTES.filter((r) => r.label.toLowerCase().includes(q.toLowerCase()))
      : NAV_ROUTES;
    const tickerItems = (q.trim() ? tickers : [...recent, ...trending])
      .map((t) => ({
        type: 'tkr',
        ticker: t.ticker,
        label: t.name ? `${t.ticker} — ${t.name}` : t.ticker,
        to: `/stock/${encodeURIComponent(t.ticker)}`,
        icon: TrendingUp,
        hint: t._hint || 'Stock',
      }));
    const fallback = q.trim() && tickerItems.length === 0 && !loading
      ? [{
          type: 'tkr',
          ticker: q.trim().toUpperCase(),
          label: `Search "${q.toUpperCase()}"`,
          to: `/stock/${encodeURIComponent(q.toUpperCase())}`,
          icon: Search,
          hint: 'Open',
        }]
      : [];
    return [...tickerItems, ...navFiltered, ...fallback];
  }, [q, tickers, recent, trending, loading]);

  useEffect(() => { setActive(0); }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = items[active];
        if (r) {
          if (r.type === 'tkr') pushRecent({ ticker: r.ticker, name: r.label.split(' — ')[1] });
          navigate(r.to);
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active, navigate, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          <motion.div
            className="cmdk-panel"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cmdk-input-row">
              <Search size={18} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                className="cmdk-input"
                placeholder="Search a ticker, company, or jump to a page…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span className="topbar-kbd">ESC</span>
            </div>
            <div className="cmdk-results">
              {loading && q.trim() && (
                <div className="cmdk-empty" style={{ padding: '20px' }}>Searching…</div>
              )}
              {!loading && items.length === 0 && <div className="cmdk-empty">Nothing matches</div>}
              {items.map((r, i) => (
                <div
                  key={`${r.type}-${r.label}`}
                  className={cx('cmdk-item', i === active && 'cmdk-item--active')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    if (r.type === 'tkr') pushRecent({ ticker: r.ticker, name: r.label.split(' — ')[1] });
                    navigate(r.to); onClose?.();
                  }}
                >
                  <span className="cmdk-item-icon"><r.icon size={16} /></span>
                  <span>{r.label}</span>
                  <span className="cmdk-item-hint">{r.hint} <ArrowRight size={10} /></span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
