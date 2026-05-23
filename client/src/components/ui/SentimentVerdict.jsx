import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { cx } from '../../lib/format';
import SentimentMeter from './SentimentMeter';
import Skeleton from './Skeleton';
import './SentimentVerdict.css';

/**
 * Production-grade sentiment verdict card.
 *
 * Props:
 *   verdict — backend `verdict` object: { label, score, confidence, momentum,
 *             distribution, article_count, sources, explanation, top_drivers }
 *   loading — boolean
 */
export default function SentimentVerdict({ verdict, loading = false }) {
  if (loading) {
    return (
      <div className="sv sv--neutral">
        <div className="sv-eyebrow"><Sparkles size={12} /> AI sentiment verdict</div>
        <Skeleton width="60%" height={36} />
        <Skeleton width="100%" height={10} />
        <Skeleton width="100%" height={72} />
        <Skeleton width="80%" height={20} />
      </div>
    );
  }

  if (!verdict) return null;

  const label = verdict.label || 'neutral';
  const score = Number(verdict.score || 0);
  const confidence = Number(verdict.confidence || 0);
  const momentum = Number(verdict.momentum || 0);
  const dist = verdict.distribution || { bullish: 0, neutral: 1, bearish: 0 };
  const article_count = verdict.article_count || 0;
  const sources = verdict.sources || [];
  const explanation = verdict.explanation || '';

  // bullish/bearish counts derived from the distribution for the meter
  const bull = Math.round(dist.bullish * 100);
  const neu  = Math.round(dist.neutral * 100);
  const bear = Math.round(dist.bearish * 100);

  const momentumLabel =
    momentum >= 0.20  ? 'Strongly improving' :
    momentum >= 0.05  ? 'Improving' :
    momentum <= -0.20 ? 'Sharply weakening' :
    momentum <= -0.05 ? 'Weakening' :
                        'Stable';
  const momentumDir = momentum > 0.02 ? 'up' : momentum < -0.02 ? 'down' : 'flat';
  const MomIcon = momentumDir === 'up' ? TrendingUp : momentumDir === 'down' ? TrendingDown : Minus;

  const labelDisplay = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <motion.div
      className={cx('sv', `sv--${label}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="sv-eyebrow">
        <Sparkles size={12} />
        AI sentiment verdict
      </div>

      <div className="sv-verdict">
        <div className={cx('sv-label', `sv-label--${label}`)}>{labelDisplay}</div>
        <div className="sv-score">
          {score >= 0 ? '+' : ''}{score.toFixed(2)}<span style={{ color: 'var(--text-muted)' }}> / 1.00</span>
        </div>
      </div>

      <div className="sv-meter-wrap">
        <SentimentMeter bullish={bull} neutral={neu} bearish={bear} showLegend />
        <div className="sv-confidence">
          <span>Confidence</span>
          <div className="sv-confidence-bar">
            <motion.div
              className="sv-confidence-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(confidence * 100)}%` }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="sv-confidence-value">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {explanation && (
        <div className="sv-explain">{explanation}</div>
      )}

      <div className="sv-meta-row">
        <div className="sv-meta">
          <div className="sv-meta-label"><Activity size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> 24h momentum</div>
          <div className={cx('sv-meta-value', `sv-momentum--${momentumDir}`)}>
            <MomIcon size={14} strokeWidth={2.5} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            {momentumLabel}
          </div>
        </div>
        <div className="sv-meta">
          <div className="sv-meta-label">Articles analyzed</div>
          <div className="sv-meta-value">{article_count}</div>
        </div>
      </div>

      {sources.length > 0 && (
        <div>
          <div className="sv-meta-label" style={{ marginBottom: 8 }}>Top sources</div>
          <div className="sv-sources">
            {sources.map((s) => (
              <span key={s} className="sv-source-chip">{s}</span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
