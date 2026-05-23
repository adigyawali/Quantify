import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cx } from '../../lib/format';

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    block = false,
    iconOnly = false,
    leading,
    trailing,
    className,
    as: Tag = 'button',
    ...rest
  },
  ref
) {
  const Component = motion(Tag);
  return (
    <Component
      ref={ref}
      whileHover={{ y: rest.disabled ? 0 : -1 }}
      whileTap={{ scale: rest.disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cx(
        'ui-btn',
        `ui-btn--${variant}`,
        `ui-btn--${size}`,
        block && 'ui-btn--block',
        iconOnly && 'ui-btn--icon',
        className
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </Component>
  );
});

export default Button;
