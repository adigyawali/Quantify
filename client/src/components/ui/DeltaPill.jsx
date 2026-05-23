import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cx } from '../../lib/format';

export default function DeltaPill({ value = 0, suffix = '%', decimals = 2, showIcon = true, className }) {
  const n = Number(value || 0);
  const dir = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const sign = n > 0 ? '+' : '';
  return (
    <span className={cx('delta-pill', `delta-pill--${dir}`, className)}>
      {showIcon && <Icon size={11} strokeWidth={2.4} />}
      {sign}{n.toFixed(decimals)}{suffix}
    </span>
  );
}
