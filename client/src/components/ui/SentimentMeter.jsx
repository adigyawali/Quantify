import { motion } from 'framer-motion';

/**
 * Three-segment sentiment bar — bullish / neutral / bearish proportions.
 */
export default function SentimentMeter({ bullish = 0, neutral = 0, bearish = 0, showLegend = true }) {
  const total = Math.max(1, bullish + neutral + bearish);
  const bullPct = (bullish / total) * 100;
  const neuPct = (neutral / total) * 100;
  const bearPct = (bearish / total) * 100;

  return (
    <div className="sm-wrap">
      <div className="sm-bar">
        <motion.div
          className="sm-segment sm-segment--bull"
          initial={{ width: 0 }}
          animate={{ width: `${bullPct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="sm-segment sm-segment--neutral"
          initial={{ width: 0 }}
          animate={{ width: `${neuPct}%` }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="sm-segment sm-segment--bear"
          initial={{ width: 0 }}
          animate={{ width: `${bearPct}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLegend && (
        <div className="sm-legend">
          <div className="lg-bull">
            <span style={{ color: 'var(--text-tertiary)' }}>BULL</span>
            <strong>{bullPct.toFixed(0)}%</strong>
          </div>
          <div className="lg-neutral" style={{ textAlign: 'center' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>NEUTRAL</span>
            <strong>{neuPct.toFixed(0)}%</strong>
          </div>
          <div className="lg-bear" style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>BEAR</span>
            <strong>{bearPct.toFixed(0)}%</strong>
          </div>
        </div>
      )}
    </div>
  );
}
