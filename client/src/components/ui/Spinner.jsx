import { cx } from '../../lib/format';

export default function Spinner({ size = 'md', className }) {
  return <span className={cx('ui-spinner', size === 'sm' && 'ui-spinner--sm', size === 'lg' && 'ui-spinner--lg', className)} />;
}
