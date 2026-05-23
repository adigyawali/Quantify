import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon, Clock, TrendingUp, ArrowRight, X, CornerDownLeft, Building2,
} from 'lucide-react';
import Input from './Input';
import { symbolsApi, getRecent, pushRecent, clearRecent, highlight } from '../../lib/symbols';
import { cx } from '../../lib/format';
import './TickerSearch.css';

/**
 * Production-quality ticker search.
 *  - 180ms debounce, race-safe results
 *  - keyboard nav (↑ ↓ Enter Esc Tab Home End)
 *  - match highlighting on ticker + name
 *  - recent searches (localStorage) + trending fallback
 *  - mobile-friendly, scroll-into-view active row
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
  const listRef = useRef(null);
  const debounceRef = useRef(0);
  const reqIdRef = useRef(0);
  const navigate = useNavigate();

  // Fetch trending once
  useEffect(() => {
    let cancelled = false;
    symbolsApi.trending()
      .then((data) => { if (!cancelled) setTrending(data.results || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Debounced search with race-safety
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    clearTimeout(debounceRef.current);
    const myReq = ++reqIdRef.current;
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      symbolsApi.search(trimmed, 10)
        .then((data) => {
          if (reqIdRef.current !== myReq) return;
          setResults(data.results || []);
        })
        .catch(() => { if (reqIdRef.current === myReq) setResults([]); })
        .finally(() => { if (reqIdRef.current === myReq) setLoading(false); });
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const grouped = useMemo(() => {
    if (q.trim()) return [{ section: null, items: results }];
    const groups = [];
    if (recent.length) groups.push({ section: 'Recent', items: recent });
    if (trending.length) groups.push({ section: 'Trending', items: trending });
    return groups;
  }, [q, results, recent, trending]);

  const flatItems = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  useEffect(() => { setActive(0); }, [q, results.length, recent.length, trending.length]);

  // Keep the active row scrolled into view as the user navigates with the keyboard
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-row-index="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

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
      setActive((a) => Math.min(Math.max(flatItems.length - 1, 0), a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home') {
      e.preventDefault(); setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault(); setActive(Math.max(0, flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[active] ||
        (q.trim() ? { ticker: q.trim().toUpperCase(), name: q.trim().toUpperCase() } : null);
      pick(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (q) { setQ(''); return; }
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const renderRow = (item, realIndex, sectionLabel = null) => {
    const isActive = realIndex === active;
    const nameParts = highlight(item.name, q);
    const tkParts = highlight(item.ticker, q);
    const initial = (item.ticker || '?').slice(0, 1).toUpperCase();
    return (
      <div
        key={`${sectionLabel || 'r'}-${item.ticker}-${realIndex}`}
        data-row-index={realIndex}
        className={cx('tk-search-item', isActive && 'tk-search-item--active')}
        onMouseEnter={() => setActive(realIndex)}
        onMouseDown={(e) => { e.preventDefault(); pick(item); }}
        role="option"
        aria-selected={isActive}
      >
        <div className="tk-search-logo" aria-hidden>
          <span className="tk-search-logo-initial">{initial}</span>
        </div>
        <div className="tk-search-meta">
          <div className="tk-search-row-top">
            <span className="tk-search-tk">
              {tkParts.map((p) => p.match
                ? <mark key={p.key} className="tk-search-hl">{p.text}</mark>
                : p.text)}
            </span>
            {item.exchange && (
              <span className="tk-search-exchange-pill">{item.exchange}</span>
            )}
          </div>
          <div className="tk-search-name">
            {nameParts.map((p) => p.match
              ? <mark key={p.key} className="tk-search-hl">{p.text}</mark>
              : p.text)}
          </div>
        </div>
        <div className="tk-search-side">
          {item.sector && (
            <span className="tk-search-sector" title={item.sector}>
              <Building2 size={10} /> {item.sector}
            </span>
          )}
          {!item.sector && sectionLabel === 'Recent' && (
            <span className="tk-search-side-icon"><Clock size={12} /></span>
          )}
          {!item.sector && sectionLabel === 'Trending' && (
            <span className="tk-search-side-icon"><TrendingUp size={12} /></span>
          )}
          {isActive && (
            <span className="tk-search-enter-hint" aria-hidden>
              <CornerDownLeft size={11} />
            </span>
          )}
        </div>
      </div>
    );
  };

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
              className="tk-search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="tk-search-kbd" aria-hidden>⌘K</span>
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
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tk-search-list" ref={listRef}>
              {loading && q.trim() && (
                <div className="tk-search-loading-row">
                  <div className="tk-shimmer" style={{ width: '38%' }} />
                  <div className="tk-shimmer" style={{ width: '80%' }} />
                  <div className="tk-shimmer" style={{ width: '64%' }} />
                </div>
              )}

              {!loading && q.trim() && results.length === 0 && (
                <div className="tk-search-empty">
                  <SearchIcon size={22} className="tk-search-empty-icon" />
                  <div>No matches for <strong>"{q}"</strong></div>
                  <span className="tk-search-empty-sub">Press <kbd>Enter</kbd> to open this ticker anyway.</span>
                </div>
              )}

              {!loading && grouped.map((group) => {
                const sectionStart = runningIndex;
                runningIndex += group.items.length;
                return (
                  <div key={group.section || '__results'} className="tk-search-group">
                    {group.section && (
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
                    )}
                    {group.items.map((item, idx) => renderRow(item, sectionStart + idx, group.section))}
                  </div>
                );
              })}

              {!loading && !q.trim() && grouped.length === 0 && (
                <div className="tk-search-empty">
                  <SearchIcon size={22} className="tk-search-empty-icon" />
                  <div>Start typing a ticker or company</div>
                  <span className="tk-search-empty-sub">Try <strong>AAPL</strong>, <strong>NVIDIA</strong>, <strong>Tesla</strong>.</span>
                </div>
              )}
            </div>

            {!hideFooter && (
              <div className="tk-search-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>esc</kbd> close</span>
                <span className="tk-search-foot-brand">
                  powered by Tickr <ArrowRight size={10} />
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
