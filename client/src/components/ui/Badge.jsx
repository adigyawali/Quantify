import { cx } from '../../lib/format';

export default function Badge({ children, variant = 'muted', size = 'sm', live = false, className, ...rest }) {
  return (
    <span
      className={cx(
        'ui-badge',
        size === 'lg' && 'ui-badge--lg',
        `ui-badge--${variant}`,
        live && 'ui-badge--live',
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
