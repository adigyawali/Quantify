import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Clock, TrendingUp, ArrowRight, X } from 'lucide-react';
import Input from './Input';
import Skeleton from './Skeleton';
import { symbolsApi, getRecent, pushRecent, clearRecent, highlight } from '../../lib/symbols';
import { cx } from '../../lib/format';
import './TickerSearch.css';

/**
 * Production-quality ticker search.
 *  - debounced live autocomplete
 *  - keyboard nav (↑/↓/Enter/Esc/Tab)
 *  - match highlighting
 *  - recent searches (localStorage)
 *  - trending fallback when empty
 *  - mobile-friendly
 *
 * Pass `variant="large"` for the page-level hero search.
 */
export default function TickerSearch({
  variant = 'default',
  placeholder = 'Search any ticker or company — AAPL, NVIDIA, Tesla…',
  onSelect,
  autoFocus = false,
  hideFooter = false,
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState(getRecent());
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(0);
  const reqIdRef = useRef(0);
  const navigate = useNavigate();

  // Trending — fetched once on mount
  useEffect(() => {
    let cancelled = false;
    symbolsApi.trending().then((data) => {
      if (!cancelled) setTrending(data.results || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Live search with debounce + race-safe results
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    const myReq = ++reqIdRef.current;
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      symbolsApi.search(q, 8)
        .then((data) => {
          if (reqIdRef.current !== myReq) return;
          setResults(data.results || []);
        })
        .catch(() => { if (reqIdRef.current === myReq) setResults([]); })
        .finally(() => { if (reqIdRef.current === myReq) setLoading(false); });
    }, 140);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Outside click → close
  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const visible = useMemo(() => {
    if (q.trim()) return results;
    return [
      ...(recent.length ? [{ section: 'Recent', items: recent }] : []),
      ...(trending.length ? [{ section: 'Trending', items: trending }] : []),
    ];
  }, [q, results, recent, trending]);

  const flatItems = useMemo(() => {
    if (q.trim()) return results;
    return [...recent, ...trending];
  }, [q, results, recent, trending]);

  // Reset active row whenever the result set changes
  useEffect(() => { setActive(0); }, [q, results.length, recent.length, trending.length]);

  const pick = useCallback((item) => {
    if (!item?.ticker) return;
    pushRecent({ ticker: item.ticker, name: item.name });
    setRecent(getRecent());
    setOpen(false);
    setQ('');
    if (onSelect) onSelect(item);
    else navigate(`/stock/${encodeURIComponent(item.ticker)}`);
  }, [navigate, onSelect]);

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(flatItems.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[active] || (q.trim() ? { ticker: q.trim().toUpperCase(), name: q.trim().toUpperCase() } : null);
      pick(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const renderItem = (item, idx, baseIndex = 0, sectionLabel = null) => {
    const realIdx = baseIndex + idx;
    const isActive = realIdx === active;
    const nameParts = highlight(item.name, q);
    const tkParts = highlight(item.ticker, q);
    return (
      <div
        key={`${sectionLabel || 'i'}-${item.ticker}`}
        className={cx('tk-search-item', isActive && 'tk-search-item--active')}
        onMouseEnter={() => setActive(realIdx)}
        onMouseDown={(e) => { e.preventDefault(); pick(item); }}
        role="option"
        aria-selected={isActive}
      >
        <div className="tk-search-badge">{item.ticker.slice(0, 4)}</div>
        <div className="tk-search-meta">
          <div className="tk-search-tk">
            {tkParts.map((p) => p.match ? <span key={p.key} className="tk-search-hl">{p.text}</span> : p.text)}
          </div>
          <div className="tk-search-name">
            {nameParts.map((p) => p.match ? <span key={p.key} className="tk-search-hl">{p.text}</span> : p.text)}
          </div>
        </div>
        <div className="tk-search-side">
          {item.sector && <span className="tk-search-sector">{item.sector}</span>}
          {item.exchange && <span>{item.exchange}</span>}
          {!item.sector && !item.exchange && sectionLabel === 'Recent' && <Clock size={11} />}
          {!item.sector && !item.exchange && sectionLabel === 'Trending' && <TrendingUp size={11} />}
        </div>
      </div>
    );
  };

  // Pre-compute the running offset so keyboard nav works across sections
  let runningIndex = 0;

  return (
    <div className={cx('tk-search', variant === 'large' && 'tk-search--large')} ref={wrapRef}>
      <Input
        ref={inputRef}
        size={variant === 'large' ? 'lg' : 'md'}
        leading={<SearchIcon size={variant === 'large' ? 20 : 16} />}
        trailing={
          q ? (
            <button
              type="button"
              onClick={() => { setQ(''); setOpen(true); inputRef.current?.focus(); }}
              style={{ display: 'flex', color: 'var(--text-tertiary)' }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '2px 6px', border: '1px solid var(--border-soft)', borderRadius: 4 }}>
              ⌘K
            </span>
          )
        }
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            className="tk-search-panel"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tk-search-list">
              {loading && q.trim() && (
                <div className="tk-search-loading">
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="40%" height={14} />
                </div>
              )}

              {!loading && q.trim() && results.length === 0 && (
                <div className="tk-search-empty">
                  No matches for <strong style={{ color: 'var(--text-primary)' }}>"{q}"</strong>.
                  <br />
                  <span style={{ fontSize: 11 }}>Press Enter to search this ticker anyway.</span>
                </div>
              )}

              {!loading && q.trim() && results.length > 0 && (
                <>
                  {results.map((item, idx) => renderItem(item, idx))}
                </>
              )}

              {!loading && !q.trim() && visible.map((group) => {
                const base = runningIndex;
                runningIndex += group.items.length;
                return (
                  <div key={group.section}>
                    <div className="tk-search-section">
                      <span>{group.section}</span>
                      {group.section === 'Recent' && (
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); clearRecent(); setRecent([]); }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {group.items.map((item, idx) => renderItem(item, idx, base, group.section))}
                  </div>
                );
              })}

              {!loading && !q.trim() && visible.length === 0 && (
                <div className="tk-search-empty">Start typing a ticker or company name…</div>
              )}
            </div>

            {!hideFooter && (
              <div className="tk-search-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>esc</kbd> close</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  powered by Sentivest <ArrowRight size={10} />
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
