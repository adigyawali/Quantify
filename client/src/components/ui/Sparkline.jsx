import { motion } from 'framer-motion';

/**
 * Minimal SVG sparkline that auto-fits, with gradient fill and animated draw-in.
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 36,
  color,
  strokeWidth = 1.6,
  fill = true,
  className,
}) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }

  const values = data.map((d) => (typeof d === 'number' ? d : d.value ?? d.price ?? 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const trend = values[values.length - 1] - values[0];
  const stroke = color || (trend >= 0 ? 'var(--bull)' : 'var(--bear)');
  const fillColor = trend >= 0 ? 'rgba(0,229,153,0.18)' : 'rgba(255,77,109,0.18)';

  const linePath = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg width={width} height={height} className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fillColor} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <motion.path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2.6}
        fill={stroke}
        style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
      />
    </svg>
  );
}
