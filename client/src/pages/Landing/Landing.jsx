import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Shield,
  Activity,
  Newspaper,
  LineChart,
} from 'lucide-react';
import { BrandMark } from '../../components/ui/BrandMark';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Scenery from '../../components/ui/Scenery';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import DeltaPill from '../../components/ui/DeltaPill';
import { useAuth } from '../../lib/auth';
import { stockApi } from '../../lib/api';
import './Landing.css';

function genSeries(seed = 1, n = 60, base = 100, vol = 4) {
  const out = [];
  let v = base;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    v += (r - 0.5) * vol + 0.15;
    out.push({ x: i, value: Math.max(40, v) });
  }
  return out;
}

const FEATURES = [
  {
    icon: Brain,
    title: 'FinBERT sentiment',
    desc: 'Every headline is scored by a finance-tuned BERT model into bullish, bearish, or neutral with a confidence weight.',
  },
  {
    icon: Newspaper,
    title: 'Headlines and impact',
    desc: 'Each ticker page ranks recent news by source quality, recency, and relevance — not raw count.',
  },
  {
    icon: LineChart,
    title: 'Intraday charts',
    desc: 'Real-time and last-session price bars sourced from Finnhub, with quote, change, and session range.',
  },
  {
    icon: BarChart3,
    title: 'Portfolio tracking',
    desc: 'Record lots at a cost basis and date. Total cost, P&L, and value over time are computed per position.',
  },
  {
    icon: Activity,
    title: 'Watchlist',
    desc: 'Pin tickers you care about for one-click access from the dashboard.',
  },
  {
    icon: Shield,
    title: 'JWT auth',
    desc: 'Token-based sessions, no third-party trackers, and rate limits on every public endpoint.',
  },
];

// Tickers shown in the rotating strip. Backed by the server's cached movers
// endpoint (one HTTP call per page load — server-side TTL handles the rest).
const STRIP_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO',
  'AMD', 'NFLX', 'JPM', 'COST',
];

function useTickerStrip() {
  const [rows, setRows] = useState([]);
  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    stockApi.movers(15)
      .then((res) => {
        const all = [
          ...(res.data?.gainers || []),
          ...(res.data?.losers || []),
        ];
        const byTicker = new Map(all.map((r) => [r.ticker, r]));
        const ordered = STRIP_TICKERS
          .map((t) => byTicker.get(t))
          .filter((r) => r && r.price != null);
        setRows(ordered);
      })
      .catch(() => setRows([]));
  }, []);
  return rows;
}

export default function Landing() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();
  const [series] = useState(() => genSeries(7, 80, 100, 5));
  const tickerRows = useTickerStrip();

  // Duplicate the row twice so the CSS marquee has enough content to scroll.
  const strip = useMemo(
    () => (tickerRows.length ? [...tickerRows, ...tickerRows] : []),
    [tickerRows]
  );

  return (
    <div className="landing">
      <Scenery orbs={['violet', 'cyan', 'emerald']} />

      {/* nav */}
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          <BrandMark size={30} />
          Tickr
        </Link>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#cta">Get started</a>
        </div>
        <div className="landing-nav-spacer" />
        <div className="landing-nav-actions">
          {isAuthed ? (
            <Button as={Link} to="/dashboard" trailing={<ArrowRight size={14} />}>
              Open app
            </Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
              <Button as={Link} to="/signup" size="sm" trailing={<ArrowRight size={14} />}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* hero */}
      <section className="hero">
        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Stock news, scored.
        </motion.h1>

        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Tickr pulls recent headlines for a ticker, classifies each one with FinBERT,
          and rolls them up into a single sentiment verdict — alongside price, chart,
          and portfolio tracking.
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {isAuthed ? (
            <Button as={Link} to="/dashboard" size="xl" trailing={<ArrowRight size={16} />}>
              Open dashboard
            </Button>
          ) : (
            <Button as={Link} to="/signup" size="xl" trailing={<ArrowRight size={16} />}>
              Create account
            </Button>
          )}
        </motion.div>
      </section>

      {/* ticker strip — real cached quotes from /api/market/movers */}
      {strip.length > 0 && (
        <div className="ticker-strip">
          <div className="ticker-track">
            {strip.map((row, i) => {
              const delta = row.change_percent ?? 0;
              return (
                <button
                  key={`${row.ticker}-${i}`}
                  className="ticker-pill"
                  onClick={() => navigate(`/stock/${row.ticker}`)}
                  style={{ background: 'none', border: 0, cursor: 'pointer' }}
                >
                  <span className="sym">{row.ticker}</span>
                  <span className="price">${Number(row.price).toFixed(2)}</span>
                  <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                    {delta >= 0 ? '+' : ''}{Number(delta).toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* demo dashboard mockup */}
      <div className="hero-stage">
        <motion.div
          className="demo-frame"
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="demo-bar">
            <div className="demo-bar-dots">
              <span style={{ background: '#FF5F57' }} />
              <span style={{ background: '#FEBC2E' }} />
              <span style={{ background: '#28C840' }} />
            </div>
            <div className="demo-bar-url">tickr / dashboard</div>
            <Badge variant="brand">PREVIEW</Badge>
          </div>

          <div className="demo-body">
            <div className="demo-tile">
              <div className="demo-tile-head">
                <div>
                  <div className="demo-tile-title">Example sentiment view</div>
                  <div className="demo-tile-value">
                    $<AnimatedNumber value={tickerRows[0]?.price ?? 100} duration={1200} />
                  </div>
                </div>
                <DeltaPill value={tickerRows[0]?.change_percent ?? 0} />
              </div>
              <div className="demo-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="demoGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#7C5CFF"
                      strokeWidth={2}
                      fill="url(#demoGrad)"
                      isAnimationActive
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="demo-tile">
              <div className="demo-tile-head">
                <div className="demo-tile-title">Live tickers</div>
                <Badge variant="brand">TODAY</Badge>
              </div>
              <div className="demo-side">
                {tickerRows.slice(0, 5).map((row) => (
                  <div key={row.ticker} className="demo-row">
                    <div>
                      <div className="demo-row-tk">{row.ticker}</div>
                      <div className="demo-row-name">{row.ticker}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="demo-row-pr">${Number(row.price).toFixed(2)}</div>
                      <DeltaPill value={row.change_percent ?? 0} />
                    </div>
                  </div>
                ))}
                {tickerRows.length === 0 && (
                  <div className="demo-row" style={{ opacity: 0.6 }}>
                    <div className="demo-row-name">Loading live prices…</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* features */}
      <section className="section" id="features">
        <div className="section-header">
          <h2 className="section-title">What's inside.</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="feature-icon"><f.icon size={22} /></div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="section" id="cta">
        <motion.div
          className="cta-block"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="cta-title">Get started.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthed ? (
              <Button as={Link} to="/dashboard" size="xl" trailing={<ArrowRight size={16} />}>
                Open dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/signup" size="xl" trailing={<ArrowRight size={16} />}>
                  Create account
                </Button>
                <Button as={Link} to="/login" variant="secondary" size="xl">
                  Sign in
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <BrandMark size={26} />
          Tickr
        </div>
        <div className="landing-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
        <div>© {new Date().getFullYear()} Tickr</div>
      </footer>
    </div>
  );
}
