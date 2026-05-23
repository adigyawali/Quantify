import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, ArrowUpRight, Plus, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import DeltaPill from '../../components/ui/DeltaPill';
import Sparkline from '../../components/ui/Sparkline';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../lib/auth';
import { portfolioApi } from '../../lib/api';
import { getWatchlist } from '../../lib/watchlist';
import { formatMoney, formatSignedCurrency, formatCompact } from '../../lib/format';
import './Dashboard.css';

const MOCK_MOVERS = [
  { sym: 'NVDA', name: 'NVIDIA Corp',    price: 924.51, delta: 2.41 },
  { sym: 'TSLA', name: 'Tesla Inc',      price: 254.92, delta: 4.17 },
  { sym: 'META', name: 'Meta Platforms', price: 562.18, delta: 1.92 },
  { sym: 'AAPL', name: 'Apple Inc',      price: 213.18, delta: 0.83 },
  { sym: 'AMD',  name: 'AMD',            price: 158.74, delta: -1.34 },
  { sym: 'MSFT', name: 'Microsoft',      price: 421.67, delta: -0.42 },
];

const MOCK_PULSE = [
  { label: 'S&P 500',     value: '+0.42%', color: 'var(--bull)' },
  { label: 'Nasdaq',      value: '+0.91%', color: 'var(--bull)' },
  { label: 'Russell 2000',value: '-0.18%', color: 'var(--bear)' },
  { label: 'VIX',         value: '14.21',  color: 'var(--neutral)' },
  { label: 'BTC / USD',   value: '+1.84%', color: 'var(--bull)' },
];

function genMiniSeries(seed = 1, n = 24) {
  const out = [];
  let v = 100;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    v += (r - 0.5) * 6 + 0.05;
    out.push(v);
  }
  return out;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([portfolioApi.get(), portfolioApi.history()])
      .then(([p, h]) => {
        if (!mounted) return;
        setData(p.data);
        setHistory(h.data || []);
      })
      .catch(() => { if (mounted) setErrored(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Aggregate holdings by ticker (backend stores lots separately)
  const holdingsAgg = useMemo(() => {
    if (!data?.holdings) return [];
    const map = new Map();
    data.holdings.forEach((h) => {
      const cur = map.get(h.ticker);
      if (!cur) {
        map.set(h.ticker, {
          ticker: h.ticker,
          name: h.name,
          quantity: h.quantity,
          totalCost: h.quantity * h.avg_price,
          marketValue: h.market_value,
          currentPrice: h.current_price,
        });
      } else {
        cur.quantity += h.quantity;
        cur.totalCost += h.quantity * h.avg_price;
        cur.marketValue += h.market_value;
      }
    });
    return [...map.values()].map((h) => ({
      ...h,
      avgPrice: h.totalCost / h.quantity,
      gain: h.marketValue - h.totalCost,
      gainPct: h.totalCost > 0 ? ((h.marketValue - h.totalCost) / h.totalCost) * 100 : 0,
    })).sort((a, b) => b.marketValue - a.marketValue);
  }, [data]);

  const watchlist = useMemo(() => getWatchlist(), []);

  const totalValue = Number(data?.total_value || 0);
  const gain = Number(data?.overall_gain_loss || 0);
  const gainPct = Number(data?.overall_gain_loss_percent || 0);
  const dayChange = history.length >= 2
    ? history[history.length - 1].value - history[history.length - 2].value
    : 0;
  const dayChangePct = history.length >= 2 && history[history.length - 2].value
    ? (dayChange / history[history.length - 2].value) * 100
    : 0;

  return (
    <div className="dash">
      {/* greeting */}
      <header className="dash-greet">
        <div>
          <h1>{greeting()}, <span className="accent">{user?.username || 'trader'}</span></h1>
          <div className="dash-greet-sub">
            Here's what's moving in your world — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" as={Link} to="/search" leading={<TrendingUp size={14} />}>
            Discover
          </Button>
          <Button as={Link} to="/portfolio" leading={<Plus size={14} />}>
            Add position
          </Button>
        </div>
      </header>

      {/* hero */}
      <section className="dash-hero">
        <Card padded={false} className="dash-summary-card">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="dash-summary-label">Total portfolio value</div>
            <div className="dash-summary-value">
              <span className="dash-summary-currency">$</span>
              {loading ? (
                <Skeleton width={280} height={64} />
              ) : (
                <AnimatedNumber
                  value={totalValue}
                  className="dash-summary-amount"
                  duration={1400}
                  format={(n) => formatMoney(n)}
                />
              )}
            </div>

            <div className="dash-summary-meta">
              {loading ? (
                <Skeleton width={120} height={24} />
              ) : (
                <>
                  <DeltaPill value={gainPct} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: gain >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
                    {formatSignedCurrency(gain)}
                  </span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                    all-time
                  </span>
                </>
              )}
            </div>

            <div className="dash-summary-chart">
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
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
                      formatter={(v) => [`$${formatMoney(v)}`, 'Value']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#7C5CFF"
                      strokeWidth={2}
                      fill="url(#portfolioGrad)"
                      isAnimationActive
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
                  {loading ? <Skeleton width="100%" height={140} /> : 'Add positions to see your portfolio chart.'}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="dash-side">
          <Card className="dash-side-card" delay={0.1}>
            <div className="dash-side-card-label">Today's P&amp;L</div>
            <div className="dash-side-card-value text-mono" style={{ color: dayChange >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
              {loading ? <Skeleton width={140} height={36} /> : formatSignedCurrency(dayChange)}
            </div>
            <div className="dash-side-card-foot">
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>vs. yesterday</span>
              {!loading && <DeltaPill value={dayChangePct} />}
            </div>
          </Card>

          <Card className="dash-side-card" delay={0.2}>
            <div className="dash-side-card-label">Positions</div>
            <div className="dash-side-card-value">
              {loading ? <Skeleton width={60} height={36} /> : formatCompact(holdingsAgg.length)}
            </div>
            <div className="dash-side-card-foot">
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                {(data?.holdings?.length || 0)} lots · {watchlist.length} on watchlist
              </span>
              <Briefcase size={14} color="var(--text-tertiary)" />
            </div>
          </Card>
        </div>
      </section>

      {/* holdings preview */}
      <section>
        <div className="dash-section-head">
          <h2>Your holdings</h2>
          <Link to="/portfolio">Open portfolio <ArrowRight size={12} /></Link>
        </div>

        {loading ? (
          <div className="holdings-row">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={140} radius={16} />
            ))}
          </div>
        ) : holdingsAgg.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Briefcase size={26} />}
              title="No positions yet"
              description="Search any ticker and buy your first lot. P&L will start showing here in seconds."
              action={{ label: 'Find a stock', icon: <Plus size={14} />, onClick: () => navigate('/search') }}
            />
          </Card>
        ) : (
          <div className="holdings-row">
            {holdingsAgg.slice(0, 8).map((h, i) => {
              const spark = genMiniSeries(h.ticker.charCodeAt(0) + h.ticker.length, 24);
              return (
                <motion.div
                  key={h.ticker}
                  className="mini-holding"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => navigate(`/stock/${h.ticker}`)}
                >
                  <div className="mini-holding-top">
                    <div>
                      <div className="mini-holding-tk">{h.ticker}</div>
                      <div className="mini-holding-name">{h.name}</div>
                    </div>
                    <DeltaPill value={h.gainPct} />
                  </div>
                  <div className="mini-holding-spark">
                    <Sparkline data={spark} width={200} height={36} color={h.gainPct >= 0 ? 'var(--bull)' : 'var(--bear)'} />
                  </div>
                  <div className="mini-holding-bot">
                    <div className="mini-holding-price">${formatMoney(h.marketValue)}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {h.quantity} sh
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* movers + pulse */}
      <section className="dash-row-2">
        <Card>
          <div className="dash-section-head" style={{ marginBottom: 16 }}>
            <h2>Market movers</h2>
            <Badge variant="brand">DEMO</Badge>
          </div>
          <div className="movers-list">
            {MOCK_MOVERS.map((m, i) => (
              <Link key={m.sym} to={`/stock/${m.sym}`} className="movers-item">
                <div className="movers-rank">{i + 1}</div>
                <div>
                  <div className="movers-tk">{m.sym}</div>
                  <div className="movers-name">{m.name}</div>
                </div>
                <div>
                  <Sparkline
                    data={genMiniSeries(m.sym.charCodeAt(0) * 31, 20)}
                    width={80}
                    height={28}
                    color={m.delta >= 0 ? 'var(--bull)' : 'var(--bear)'}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="movers-price">${m.price.toFixed(2)}</div>
                  <DeltaPill value={m.delta} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="pulse-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600 }}>Market pulse</h2>
            <Badge variant="bull" live>LIVE</Badge>
          </div>
          {MOCK_PULSE.map((p) => (
            <div className="pulse-row" key={p.label}>
              <div className="pulse-label">
                <span className="pulse-dot" style={{ background: p.color, color: p.color }} />
                {p.label}
              </div>
              <div className="pulse-value" style={{ color: p.color }}>{p.value}</div>
            </div>
          ))}
          <Button variant="ghost" size="sm" trailing={<ArrowUpRight size={14} />} as={Link} to="/search">
            Explore more
          </Button>
        </Card>
      </section>

      {errored && (
        <div className="auth-error">
          Couldn't reach the backend. Check that the Flask server is running.
        </div>
      )}
    </div>
  );
}
