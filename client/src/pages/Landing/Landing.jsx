import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  BarChart3,
  Brain,
  Shield,
  Activity,
  Zap,
  Globe,
  PlayCircle,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Scenery from '../../components/ui/Scenery';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import DeltaPill from '../../components/ui/DeltaPill';
import { useAuth } from '../../lib/auth';
import './Landing.css';

const FAKE_TICKERS = [
  ['NVDA', 924.51, 2.41], ['AAPL', 213.18, 0.83], ['MSFT', 421.67, -0.42],
  ['TSLA', 254.92, 4.17], ['GOOGL', 167.84, 1.04], ['AMZN', 198.30, -0.61],
  ['META', 562.18, 1.92], ['AMD', 158.74, -1.34], ['SPY', 524.92, 0.42],
  ['NFLX', 712.40, 0.71], ['PLTR', 31.85, 5.21], ['CRWD', 297.55, -2.13],
];

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
    title: 'AI-graded sentiment',
    desc: 'FinBERT scores every headline so you see how the market feels before the chart moves.',
  },
  {
    icon: Activity,
    title: 'Real-time pulse',
    desc: 'Live price ticks, sparklines, and momentum indicators across your entire watchlist.',
  },
  {
    icon: BarChart3,
    title: 'Portfolio analytics',
    desc: 'Track cost-basis, P&L, and value-over-time across every position, lot-by-lot.',
  },
  {
    icon: Zap,
    title: 'Fast as light',
    desc: 'Spring-physics interactions, optimistic UI, and instant cross-ticker navigation.',
  },
  {
    icon: Shield,
    title: 'Your data, locked',
    desc: 'JWT-secured sessions, no third-party trackers, and never a leaked position.',
  },
  {
    icon: Globe,
    title: 'Global coverage',
    desc: 'Powered by Finnhub & Alpha Vantage — thousands of US-listed equities at your fingertips.',
  },
];

export default function Landing() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();
  const [series] = useState(() => genSeries(7, 80, 100, 5));
  const [counter, setCounter] = useState(1284293);

  useEffect(() => {
    const id = setInterval(() => setCounter((c) => c + Math.floor(Math.random() * 30) + 5), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <Scenery orbs={['violet', 'cyan', 'emerald']} />

      {/* nav */}
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          <div className="sidebar-mark" style={{ width: 30, height: 30, borderRadius: 8 }}>
            <TrendingUp size={15} strokeWidth={2.5} />
          </div>
          Sentivest
        </Link>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#stats">Numbers</a>
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
                Start free
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* hero */}
      <section className="hero">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="hero-eyebrow">
            <span className="hero-eyebrow-tag">NEW</span>
            FinBERT sentiment models are live · v2.0
          </span>
        </motion.div>

        <motion.h1
          className="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          Read the market<br />
          <span className="accent">before it moves.</span>
        </motion.h1>

        <motion.p
          className="hero-sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          A real-time fintech terminal that grades every headline with AI, tracks your portfolio with
          institutional precision, and surfaces sentiment shifts in milliseconds.
        </motion.p>

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          {isAuthed ? (
            <Button as={Link} to="/dashboard" size="xl" trailing={<ArrowRight size={16} />}>
              Open your dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} to="/signup" size="xl" trailing={<ArrowRight size={16} />}>
                Create account — free
              </Button>
              <Button as={Link} to="/login" variant="secondary" size="xl" leading={<PlayCircle size={16} />}>
                Watch live demo
              </Button>
            </>
          )}
        </motion.div>

        <motion.div
          className="hero-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <span className="hero-meta-item"><Sparkles size={12} /> No credit card</span>
          <span className="hero-meta-item"><Shield size={12} /> JWT-secured</span>
          <span className="hero-meta-item"><Activity size={12} /> Real-time data</span>
        </motion.div>
      </section>

      {/* ticker strip */}
      <div className="ticker-strip">
        <div className="ticker-track">
          {[...FAKE_TICKERS, ...FAKE_TICKERS].map(([sym, price, delta], i) => (
            <button
              key={i}
              className="ticker-pill"
              onClick={() => navigate(`/stock/${sym}`)}
              style={{ background: 'none', border: 0, cursor: 'pointer' }}
            >
              <span className="sym">{sym}</span>
              <span className="price">${price.toFixed(2)}</span>
              <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>
      </div>

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
            <div className="demo-bar-url">sentivest.app / dashboard / nvda</div>
            <Badge variant="bull" live>LIVE</Badge>
          </div>

          <div className="demo-body">
            <div className="demo-tile">
              <div className="demo-tile-head">
                <div>
                  <div className="demo-tile-title">NVDA · NVIDIA Corp</div>
                  <div className="demo-tile-value">
                    $<AnimatedNumber value={924.51} duration={1200} />
                  </div>
                </div>
                <DeltaPill value={2.41} />
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
                <div className="demo-tile-title">Top movers</div>
                <Badge variant="brand">TODAY</Badge>
              </div>
              <div className="demo-side">
                {[
                  ['NVDA', 'NVIDIA', 924.51, 2.41],
                  ['TSLA', 'Tesla', 254.92, 4.17],
                  ['META', 'Meta', 562.18, 1.92],
                  ['AAPL', 'Apple', 213.18, 0.83],
                  ['AMD', 'AMD', 158.74, -1.34],
                ].map(([sym, name, p, d]) => (
                  <div key={sym} className="demo-row">
                    <div>
                      <div className="demo-row-tk">{sym}</div>
                      <div className="demo-row-name">{name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="demo-row-pr">${p.toFixed(2)}</div>
                      <DeltaPill value={d} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* features */}
      <section className="section" id="features">
        <div className="section-header">
          <div className="section-eyebrow">PRODUCT</div>
          <h2 className="section-title">An entire trading desk — distilled.</h2>
          <p className="section-sub">
            Built for the trader who wants Bloomberg's signal, Robinhood's simplicity,
            and the aesthetics of an AI-native product.
          </p>
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

      {/* stats */}
      <section className="section" id="stats" style={{ paddingTop: 0 }}>
        <motion.div
          className="stats-row"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="stat">
            <div className="stat-value">
              <AnimatedNumber
                value={counter}
                duration={1500}
                format={(n) => Math.round(n).toLocaleString('en-US')}
              />
            </div>
            <div className="stat-label">Headlines analyzed</div>
          </div>
          <div className="stat">
            <div className="stat-value">98.4%</div>
            <div className="stat-label">Sentiment accuracy</div>
          </div>
          <div className="stat">
            <div className="stat-value">&lt;120ms</div>
            <div className="stat-label">Median response</div>
          </div>
          <div className="stat">
            <div className="stat-value">12K+</div>
            <div className="stat-label">Tickers covered</div>
          </div>
        </motion.div>
      </section>

      {/* cta */}
      <section className="section" id="cta">
        <motion.div
          className="cta-block"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="cta-title">Trade with the conviction of an institution.</h2>
          <p className="cta-sub">
            Create an account in 30 seconds — no card, no commitment. Your portfolio and watchlists
            are private to you.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthed ? (
              <Button as={Link} to="/dashboard" size="xl" trailing={<ArrowRight size={16} />}>
                Open dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/signup" size="xl" trailing={<ArrowRight size={16} />}>
                  Create your account
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
          <div className="sidebar-mark" style={{ width: 26, height: 26, borderRadius: 7 }}>
            <TrendingUp size={13} strokeWidth={2.5} />
          </div>
          Sentivest · made for traders who think
        </div>
        <div>© {new Date().getFullYear()} Sentivest. All rights reserved.</div>
      </footer>
    </div>
  );
}
