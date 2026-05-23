import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import TickerSearch from '../../components/ui/TickerSearch';
import Sparkline from '../../components/ui/Sparkline';
import DeltaPill from '../../components/ui/DeltaPill';
import Badge from '../../components/ui/Badge';
import { symbolsApi, getRecent } from '../../lib/symbols';
import './Stock.css';

function genSeries(seed = 1, n = 24) {
  const out = []; let v = 100; let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    v += (s / 233280 - 0.5) * 6 + 0.05;
    out.push(v);
  }
  return out;
}

export default function Search() {
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState(getRecent());
  const navigate = useNavigate();

  useEffect(() => {
    symbolsApi.trending().then((d) => setTrending(d.results || [])).catch(() => {});
    setRecent(getRecent());
  }, []);

  return (
    <div>
      <section className="search-hero">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Find any ticker. <span className="accent">Read the tape.</span>
        </motion.h1>
        <motion.p
          className="search-hero-sub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Search by ticker or company name — AI-graded sentiment, real-time pricing,
          and the headlines actually moving the stock.
        </motion.p>

        <motion.div
          style={{ maxWidth: 640, margin: '0 auto' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <TickerSearch variant="large" autoFocus />
        </motion.div>
      </section>

      {recent.length > 0 && (
        <section style={{ marginTop: 'var(--s-10)' }}>
          <div className="dash-section-head">
            <h2>Recently viewed</h2>
            <Badge variant="muted">{recent.length}</Badge>
          </div>
          <div className="holdings-row">
            {recent.map((t, i) => (
              <motion.div
                key={t.ticker}
                className="mini-holding"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                onClick={() => navigate(`/stock/${t.ticker}`)}
              >
                <div className="mini-holding-top">
                  <div>
                    <div className="mini-holding-tk">{t.ticker}</div>
                    <div className="mini-holding-name">{t.name}</div>
                  </div>
                  <ArrowRight size={14} color="var(--text-tertiary)" />
                </div>
                <div className="mini-holding-spark">
                  <Sparkline data={genSeries(t.ticker.charCodeAt(0) * 7, 24)} width={200} height={36} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 'var(--s-12)' }}>
        <div className="dash-section-head">
          <h2>Trending tickers</h2>
          <Badge variant="brand">CURATED</Badge>
        </div>
        <div className="holdings-row">
          {trending.map((t, i) => {
            const series = genSeries(t.ticker.charCodeAt(0) * 7 + t.ticker.length, 24);
            const delta = ((series[series.length - 1] - series[0]) / series[0]) * 100;
            return (
              <motion.div
                key={t.ticker}
                className="mini-holding"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.04 }}
                onClick={() => navigate(`/stock/${t.ticker}`)}
              >
                <div className="mini-holding-top">
                  <div>
                    <div className="mini-holding-tk">{t.ticker}</div>
                    <div className="mini-holding-name">{t.name}</div>
                  </div>
                  <DeltaPill value={delta} />
                </div>
                <div className="mini-holding-spark">
                  <Sparkline data={series} width={200} height={36} color={delta >= 0 ? 'var(--bull)' : 'var(--bear)'} />
                </div>
                <div className="mini-holding-bot">
                  <div className="mini-holding-price text-mono">{t.sector || t.exchange || '—'}</div>
                  <ArrowRight size={14} color="var(--text-tertiary)" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
