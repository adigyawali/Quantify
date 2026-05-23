import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import Scenery from '../../components/ui/Scenery';
import { BrandMark } from '../../components/ui/BrandMark';

const PILLARS = [
  { icon: Sparkles,    label: 'AI sentiment',  body: 'Headlines distilled into a clean directional read.' },
  { icon: Zap,         label: 'Real-time data', body: 'Live quotes, intraday charts, market-state aware.' },
  { icon: ShieldCheck, label: 'Secure by default', body: 'Hashed credentials, rate-limited auth, encrypted in transit.' },
];

export default function AuthLayout({ children, title, sub }) {
  return (
    <div className="auth-shell">
      <Scenery orbs={['violet']} />

      <aside className="auth-visual">
        <Link to="/" className="auth-visual-brand">
          <BrandMark size={32} />
          <span>Tickr</span>
        </Link>

        <motion.div
          className="auth-visual-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h2 className="auth-visual-quote">
            Market intelligence,
            <br />
            <span className="accent">clarified</span>.
          </h2>
          <p className="auth-visual-sub">
            Market news, sentiment, and price action
          </p>

          <ul className="auth-pillars">
            {PILLARS.map((p) => (
              <li key={p.label} className="auth-pillar">
                <span className="auth-pillar-icon"><p.icon size={14} /></span>
                <div>
                  <div className="auth-pillar-label">{p.label}</div>
                  <div className="auth-pillar-body">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="auth-visual-foot">
          <span className="auth-visual-foot-dot" /> Calm by design · Built for conviction
        </div>
      </aside>

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
            <BrandMark size={28} />
            <span>Tickr</span>
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{sub}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
