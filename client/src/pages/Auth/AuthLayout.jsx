import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Scenery from '../../components/ui/Scenery';
import DeltaPill from '../../components/ui/DeltaPill';

function genSeries(seed = 7, n = 50, base = 100) {
  const out = [];
  let v = base;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    v += (r - 0.5) * 4 + 0.2;
    out.push({ x: i, value: v });
  }
  return out;
}

export default function AuthLayout({ children, title, sub }) {
  const [series, setSeries] = useState(() => genSeries(7, 50, 100));

  useEffect(() => {
    const id = setInterval(() => {
      setSeries((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1].value;
        next.push({ x: prev[prev.length - 1].x + 1, value: last + (Math.random() - 0.5) * 4 + 0.1 });
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const last = series[series.length - 1].value;
  const first = series[0].value;
  const delta = ((last - first) / first) * 100;

  return (
    <div className="auth-shell">
      <Scenery orbs={['violet']} />

      {/* Left visual */}
      <aside className="auth-visual">
        <Link to="/" className="auth-visual-brand">
          <div className="sidebar-mark" style={{ width: 30, height: 30, borderRadius: 8 }}>
            <TrendingUp size={15} strokeWidth={2.5} />
          </div>
          Sentivest
        </Link>

        <motion.div
          className="auth-visual-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div className="auth-visual-quote">
            "It's how I <span className="accent">feel the tape</span> before the
            market does."
          </div>
          <div className="auth-visual-sub">
            Built for traders who want the conviction of an institutional desk with
            the clarity of a consumer app.
          </div>
        </motion.div>

        <motion.div
          className="auth-visual-mock"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          <div className="auth-mock-head">
            <div className="auth-mock-sym">NVDA · LIVE</div>
            <DeltaPill value={delta} />
          </div>
          <div className="auth-mock-price">${last.toFixed(2)}</div>
          <div className="auth-mock-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="authMockGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={delta >= 0 ? '#00E599' : '#FF4D6D'} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={delta >= 0 ? '#00E599' : '#FF4D6D'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={delta >= 0 ? '#00E599' : '#FF4D6D'}
                  strokeWidth={1.5}
                  fill="url(#authMockGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="auth-visual-meta">
          <span><strong>12K+</strong> tickers</span>
          <span><strong>1.2M+</strong> headlines analyzed</span>
          <span><strong>&lt;120ms</strong> response</span>
        </div>
      </aside>

      {/* Right form */}
      <div className="auth-form-panel">
        <Link to="/" className="auth-back">
          <ArrowLeft size={14} /> Home
        </Link>
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="auth-mark-mobile">
            <div className="sidebar-mark" style={{ width: 30, height: 30, borderRadius: 8 }}>
              <TrendingUp size={15} strokeWidth={2.5} />
            </div>
            Sentivest
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{sub}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
