import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, StarOff, Plus, ExternalLink, AlertCircle, ArrowLeft, Newspaper,
  Clock, RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import DeltaPill from '../../components/ui/DeltaPill';
import Modal from '../../components/ui/Modal';
import Input, { Field } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import SentimentVerdict from '../../components/ui/SentimentVerdict';
import { stockApi, portfolioApi } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { symbolsApi, pushRecent } from '../../lib/symbols';
import { addToWatchlist, removeFromWatchlist, inWatchlist } from '../../lib/watchlist';
import { formatMoney, formatRelativeTime, cx } from '../../lib/format';
import './Stock.css';

export default function StockDetail() {
  const { ticker: rawTicker } = useParams();
  const ticker = (rawTicker || '').toUpperCase();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const [report, setReport] = useState(null);    // { ticker, company, verdict, articles }
  const [history, setHistory] = useState([]);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingHist, setLoadingHist] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [watching, setWatching] = useState(false);

  // buy modal
  const [buyOpen, setBuyOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [bought, setBought] = useState(false);

  const fetchReport = (refresh = false) => {
    setLoadingReport(true);
    setError('');
    const cfg = refresh ? { params: { refresh: 1 } } : undefined;
    return stockApi.news(ticker, cfg)
      .then((res) => setReport(res.data))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 404) setError('No coverage for this ticker yet.');
        else if (status === 429) setError('Rate limited by news provider — try again in a moment.');
        else setError(err.response?.data?.error || err.response?.data?.message || 'Unable to load sentiment report.');
      })
      .finally(() => setLoadingReport(false));
  };

  useEffect(() => {
    setReport(null);
    setHistory([]);
    setBought(false);
    setWatching(inWatchlist(ticker));

    fetchReport();

    setLoadingHist(true);
    stockApi.history(ticker)
      .then((res) => setHistory(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingHist(false));

    // Push to recent searches with the resolved company name
    symbolsApi.lookup(ticker)
      .then((d) => pushRecent({ ticker, name: d.name || ticker }))
      .catch(() => pushRecent({ ticker, name: ticker }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReport(true);
    setRefreshing(false);
  };

  const verdict = report?.verdict;
  const articles = useMemo(() => report?.articles || [], [report]);
  const company = report?.company;

  const lastPrice = history.length ? history[history.length - 1].price : null;
  const firstPrice = history.length ? history[0].price : null;
  const pct = lastPrice && firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const change = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
  const high = history.length ? Math.max(...history.map((h) => h.price)) : null;
  const low = history.length ? Math.min(...history.map((h) => h.price)) : null;

  const toggleWatch = () => {
    if (watching) { removeFromWatchlist(ticker); setWatching(false); }
    else { addToWatchlist(ticker); setWatching(true); }
  };

  const openBuy = () => {
    if (!isAuthed) return navigate('/login');
    setQty(1);
    setPrice(lastPrice ? lastPrice.toFixed(2) : '');
    setDate(new Date().toISOString().slice(0, 10));
    setBuyError('');
    setBought(false);
    setBuyOpen(true);
  };

  const submitBuy = async () => {
    setBuyError('');
    setBusy(true);
    try {
      await portfolioApi.add({
        ticker,
        quantity: parseInt(qty, 10),
        price: parseFloat(price),
        date,
      });
      setBought(true);
      setTimeout(() => setBuyOpen(false), 900);
    } catch (err) {
      setBuyError(err.response?.data?.message || 'Could not add to portfolio.');
    } finally {
      setBusy(false);
    }
  };

  // Max impact value, for normalizing the per-article impact bars
  const maxImpact = useMemo(() => Math.max(0.1, ...articles.map((a) => a.impact || 0)), [articles]);

  return (
    <div className="stk">
      {/* Header */}
      <header className="stk-header">
        <div className="stk-symbol-row">
          <button onClick={() => navigate(-1)} className="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Back">
            <ArrowLeft size={16} />
          </button>
          <div className="stk-symbol">{ticker.slice(0, 4)}</div>
          <div className="stk-title">
            <h1>{ticker}</h1>
            <div className="stk-meta">
              <Badge variant="brand">{company || 'EQUITY'}</Badge>
              <span>·</span>
              <span>Real-time pricing via Alpha Vantage</span>
            </div>
          </div>
        </div>
        <div className="stk-actions">
          <Button
            variant="secondary"
            leading={<RefreshCw size={14} className={refreshing ? 'spinning' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing || loadingReport}
            aria-label="Refresh sentiment"
          >
            Refresh
          </Button>
          <Button
            variant={watching ? 'bull' : 'secondary'}
            leading={watching ? <Star size={14} /> : <StarOff size={14} />}
            onClick={toggleWatch}
          >
            {watching ? 'In watchlist' : 'Add to watchlist'}
          </Button>
          <Button leading={<Plus size={14} />} onClick={openBuy}>
            Buy
          </Button>
        </div>
      </header>

      {/* Price + chart + sentiment */}
      <div className="stk-price-grid">
        <Card className="stk-chart-card" padded={false}>
          <div style={{ padding: 'var(--s-6)' }}>
            <div className="stk-chart-head">
              <div>
                <div className="dash-summary-label">Price (intraday 5-min)</div>
                <div className="stk-chart-price" style={{ marginTop: 8 }}>
                  <span className="stk-chart-currency">$</span>
                  {loadingHist || !lastPrice ? (
                    <Skeleton width={200} height={48} />
                  ) : (
                    <AnimatedNumber value={lastPrice} format={(n) => formatMoney(n)} />
                  )}
                </div>
                {!loadingHist && lastPrice && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <DeltaPill value={pct} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: change >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
                      {change >= 0 ? '+' : ''}{formatMoney(change)}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>session</span>
                  </div>
                )}
              </div>
              <Badge variant="bull" live>LIVE</Badge>
            </div>

            <div className="stk-chart">
              {loadingHist ? (
                <Skeleton width="100%" height={280} radius={12} />
              ) : history.length < 2 ? (
                <EmptyState
                  icon={<AlertCircle size={26} />}
                  title="No intraday data"
                  description="Alpha Vantage may be rate-limited or this symbol has no recent activity."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="stkGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={pct >= 0 ? '#00E599' : '#FF4D6D'} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={pct >= 0 ? '#00E599' : '#FF4D6D'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={50}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20,24,35,0.96)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 10,
                        fontSize: 12,
                        padding: '8px 12px',
                      }}
                      labelStyle={{ color: 'var(--text-tertiary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(v) => [`$${formatMoney(v)}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={pct >= 0 ? '#00E599' : '#FF4D6D'}
                      strokeWidth={2}
                      fill="url(#stkGrad)"
                      isAnimationActive
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {!loadingHist && lastPrice && (
              <div className="stk-stats">
                <div>
                  <div className="stk-stat-label">Session high</div>
                  <div className="stk-stat-value">${formatMoney(high)}</div>
                </div>
                <div>
                  <div className="stk-stat-label">Session low</div>
                  <div className="stk-stat-value">${formatMoney(low)}</div>
                </div>
                <div>
                  <div className="stk-stat-label">Range</div>
                  <div className="stk-stat-value">${formatMoney(high - low)}</div>
                </div>
                <div>
                  <div className="stk-stat-label">Points</div>
                  <div className="stk-stat-value">{history.length}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <SentimentVerdict verdict={verdict} loading={loadingReport} />
      </div>

      {/* News */}
      <section>
        <div className="dash-section-head">
          <h2><Newspaper size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} /> Headlines &amp; impact</h2>
          {!loadingReport && articles.length > 0 && (
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
              {articles.length} articles · ranked by impact score
            </span>
          )}
        </div>

        {loadingReport ? (
          <div className="news-list">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="news-item" style={{ pointerEvents: 'none' }}>
                <div className="news-item-bar neutral" />
                <div className="news-item-content">
                  <Skeleton width="40%" height={12} />
                  <div style={{ height: 8 }} />
                  <Skeleton width="90%" height={18} />
                  <div style={{ height: 6 }} />
                  <Skeleton width="70%" height={18} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <Card>
            <EmptyState
              icon={<AlertCircle size={26} />}
              title="Couldn't load sentiment report"
              description={error}
            />
          </Card>
        ) : articles.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Newspaper size={26} />}
              title="No analyzable headlines"
              description={report?.message || "We didn't find any relevant headlines for this ticker in the last week."}
            />
          </Card>
        ) : (
          <div className="news-list">
            {articles.map((a, i) => {
              const sk = (a.sentiment_label || 'neutral').toLowerCase();
              const impactPct = Math.round((a.impact || 0) / maxImpact * 100);
              const relPct = Math.round((a.relevance || 0) * 100);
              const confPct = Math.round((a.sentiment_confidence || 0) * 100);
              const tier =
                a.source_weight >= 0.95 ? { label: 'Tier 1', color: 'var(--bull)' } :
                a.source_weight >= 0.75 ? { label: 'Tier 2', color: 'var(--brand-300)' } :
                a.source_weight >= 0.55 ? { label: 'Tier 3', color: 'var(--neutral)' } :
                a.source_weight >= 0.35 ? { label: 'Tier 4', color: 'var(--text-tertiary)' } :
                                          { label: 'Tier 5', color: 'var(--text-muted)' };
              return (
                <motion.a
                  key={i}
                  href={a.url || '#'}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="news-item"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <div className={`news-item-bar ${sk}`} />
                  <div className="news-item-content">
                    <div className="news-item-top">
                      {a.source && <span className="news-item-source">{a.source}</span>}
                      <span style={{ color: tier.color, fontWeight: 600 }}>· {tier.label}</span>
                      {a.published_at && (
                        <>
                          <span>·</span>
                          <span><Clock size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />{formatRelativeTime(a.published_at)}</span>
                        </>
                      )}
                      <span>·</span>
                      <span title={`Relevance ${relPct}% · Confidence ${confPct}%`}>
                        {relPct}% relevance
                      </span>
                    </div>
                    <div className="news-item-headline">{a.headline}</div>
                    {a.summary && <div className="news-item-summary">{a.summary}</div>}

                    <div className="impact-bar" title={`Impact ${impactPct}%`}>
                      <motion.div
                        className={cx('impact-fill', `impact-fill--${sk}`)}
                        initial={{ width: 0 }}
                        animate={{ width: `${impactPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 + 0.1 }}
                      />
                    </div>
                  </div>
                  <div className="news-item-meta">
                    <Badge variant={sk === 'bullish' ? 'bull' : sk === 'bearish' ? 'bear' : 'neutral'}>
                      {a.sentiment_label}
                    </Badge>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {confPct}%
                    </span>
                    <ExternalLink size={12} color="var(--text-muted)" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </section>

      {/* Buy modal — unchanged */}
      <Modal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        title={`Add ${ticker} to portfolio`}
        subtitle="Record a lot at a specific cost basis and date."
      >
        {bought ? (
          <div className="auth-success">
            ✓ Added {qty} sh of {ticker} at ${price}
          </div>
        ) : (
          <>
            {buyError && <div className="auth-error" style={{ marginBottom: 16 }}>{buyError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Quantity">
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
              <Field label="Price per share">
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  leading={<span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>$</span>}
                />
              </Field>
              <Field label="Purchase date">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 10, fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                Total cost: <strong style={{ color: 'var(--text-primary)' }}>${formatMoney((parseFloat(qty || 0) * parseFloat(price || 0)) || 0)}</strong>
              </div>
            </div>
            <div className="ui-modal-actions">
              <Button variant="ghost" onClick={() => setBuyOpen(false)}>Cancel</Button>
              <Button onClick={submitBuy} disabled={busy} leading={<Plus size={14} />}>
                {busy ? 'Adding…' : 'Confirm buy'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
