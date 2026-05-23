import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates a number from its previous value to the new one.
 * Pass formatter to control display (e.g. money, percent).
 */
export default function AnimatedNumber({
  value,
  duration = 900,
  format = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  className,
  style,
}) {
  const [display, setDisplay] = useState(value || 0);
  const fromRef = useRef(value || 0);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const target = Number(value || 0);
    fromRef.current = display;
    startRef.current = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      // ease-out-expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {format(display)}
    </span>
  );
}
