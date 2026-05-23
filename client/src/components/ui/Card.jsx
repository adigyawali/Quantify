import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cx } from '../../lib/format';

const Card = forwardRef(function Card(
  { children, padded = true, paddedSize = 'md', glow = false, sheen = false, interactive = false, className, animate = true, delay = 0, ...rest },
  ref
) {
  const padClass = padded
    ? paddedSize === 'lg'
      ? 'ui-card--padded-lg'
      : paddedSize === 'sm'
      ? 'ui-card--padded-sm'
      : 'ui-card--padded'
    : '';

  const Component = animate ? motion.div : 'div';
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  return (
    <Component
      ref={ref}
      className={cx(
        'ui-card',
        padClass,
        glow && 'ui-card--glow',
        sheen && 'ui-card--sheen',
        interactive && 'ui-card--interactive',
        className
      )}
      {...motionProps}
      {...rest}
    >
      {children}
    </Component>
  );
});

export default Card;
