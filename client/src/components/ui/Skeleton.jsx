import { cx } from '../../lib/format';

export default function Skeleton({ width = '100%', height = 16, radius, className, style, ...rest }) {
  return (
    <span
      className={cx('ui-skeleton', className)}
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      {...rest}
    />
  );
}
