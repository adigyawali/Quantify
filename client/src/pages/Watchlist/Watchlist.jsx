import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, X, Plus, Newspaper, Clock, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Sparkline from '../../components/ui/Sparkline';
import DeltaPill from '../../components/ui/DeltaPill';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../../lib/watchlist';
import { stockApi } from '../../lib/api';
import { formatRelativeTime } from '../../lib/format';
import './Watchlist.css';

function genSeries(seed = 1, n = 24) {
  const out = []; let v = 100; let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    v += (s / 233280 - 0.5) * 6 + 0.05;
    out.push(v);
  }
  return out;
}

export default function Watchlist() {
  const [tickers, setTickers] = useState([]);
  const [addQ, setAddQ] = useState('');
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const navigate = useNavigate();

  const refresh = () => setTickers(getWatchlist());

  useEffect(() => { refresh(); }, []);

  // Build sentiment feed: fetch first headline from up to 5 watchlist tickers.
  useEffect(() => {
    let cancelled = false;
    setLoadingFeed(true);
    const sample = tickers.slice(0, 5);
    if (sample.length === 0) { setFeed([]); setLoadingFeed(false); return; }
    Promise.all(
      sample.map((t) => stockApi.news(t).then(r => ({ ticker: t, news: r.data.news || [] })).catch(() => ({ ticker: t, news: [] })))
    ).then((results) => {
      if (cancelled) return;
      const items = [];
      results.forEach((r) => r.news.slice(0, 2).forEach((n) => items.push({ ...n, ticker: r.ticker })));
      items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
      setFeed(items.slice(0, 12));
    }).finally(() => { if (!cancelled) setLoadingFeed(false); });

    return () => { cancelled = true; };
  }, [tickers]);

  const handleAdd = (e) => {
    e.preventDefault();
    const t = addQ.trim().toUpperCase();
    if (!t) return;
    addToWatchlist(t);
    setAddQ('');
    refresh();
  };

  const handleRemove = (t, e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchlist(t);
    refresh();
  };

  return (
    <div className="wl">
      <header className="wl-header">
        <div>
          <h1>Your <span className="accent">watchlist</span></h1>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', marginTop: 4 }}>
            Stocks you're tracking, plus a live sentiment feed across them.
          </div>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, width: 'min(100%, 360px)' }}>
          <Input
            leading={<Search size={16} />}
            placeholder="Add ticker — e.g. NVDA"
            value={addQ}
            onChange={(e) => setAddQ(e.target.value.toUpperCase())}
          />
          <Button type="submit" leading={<Plus size={14} />}>Add</Button>
        </form>
      </header>

      <div className="wl-grid">
        {/* List */}
        <Card className="wl-card" padded={false}>
          <div className="dash-section-head" style={{ padding: 'var(--s-5)', marginBottom: 0, borderBottom: '1px solid var(--border-subtle)' }}>
            <h2><Star size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} /> Tracked tickers</h2>
            <Badge variant="muted">{tickers.length}</Badge>
          </div>

          {tickers.length === 0 ? (
            <EmptyState
              icon={<Star size={26} />}
              title="No tickers yet"
              description="Add stocks here to monitor sentiment, news, and price action without buying them."
              action={{ label: 'Discover stocks', icon: <Search size={14} />, onClick: () => navigate('/search') }}
            />
          ) : (
            <div className="wl-list">
              <AnimatePresence initial={false}>
                {tickers.map((t, i) => {
                  const series = genSeries(t.charCodeAt(0) * 13 + t.length, 24);
                  const delta = ((series[series.length - 1] - series[0]) / series[0]) * 100;
                  return (
                    <motion.div
                      key={t}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                    >
                      <Link to={`/stock/${t}`} className="wl-row">
                        <div className="wl-row-sym">
                          <span className="wl-row-tk">{t}</span>
                          <span className="wl-row-status">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bull)', boxShadow: '0 0 6px var(--bull)' }} />
                            Live
                          </span>
                        </div>
                        <div className="wl-row-spark">
                          <Sparkline data={series} width={100} height={32} color={delta >= 0 ? 'var(--bull)' : 'var(--bear)'} />
                        </div>
                        <div className="wl-row-delta">
                          <DeltaPill value={delta} />
                        </div>
                        <button className="wl-remove" onClick={(e) => handleRemove(t, e)} aria-label="Remove">
                          <X size={14} />
                        </button>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {/* Feed */}
        <Card>
          <div className="dash-section-head" style={{ marginBottom: 16 }}>
            <h2><Newspaper size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} /> Sentiment feed</h2>
            <Badge variant="bull" live>LIVE</Badge>
          </div>

          {tickers.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-tertiary)', textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
              Add tickers to populate your sentiment feed.
            </div>
          ) : loadingFeed ? (
            <div className="feed">
              {[0, 1, 2, 3].map((i) => (
                <div className="feed-card" key={i}>
                  <Skeleton width="30%" height={14} />
                  <div style={{ height: 10 }} />
                  <Skeleton width="95%" height={16} />
                  <div style={{ height: 6 }} />
                  <Skeleton width="60%" height={16} />
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <EmptyState icon={<Newspaper size={26} />} title="No headlines yet" description="No analyzable news for your tickers right now." />
          ) : (
            <div className="feed">
              {feed.map((item, i) => {
                const sk = (item.sentiment || 'neutral').toLowerCase();
                return (
                  <motion.a
                    key={i}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="feed-card"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <div className="feed-card-top">
                      <Link
                        to={`/stock/${item.ticker}`}
                        className="feed-card-tk"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.ticker}
                      </Link>
                      <Badge variant={sk === 'bullish' ? 'bull' : sk === 'bearish' ? 'bear' : 'neutral'}>
                        {item.sentiment}
                      </Badge>
                      <span className="feed-card-time">
                        <Clock size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                        {formatRelativeTime(item.publishedAt)}
                      </span>
                      <ExternalLink size={12} color="var(--text-muted)" />
                    </div>
                    <div className="feed-card-headline">{item.headline}</div>
                  </motion.a>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
