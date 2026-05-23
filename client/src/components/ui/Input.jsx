import { forwardRef, useState } from 'react';
import { cx } from '../../lib/format';

const Input = forwardRef(function Input(
  { leading, trailing, size = 'md', error, className, wrapClassName, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={cx(
        'ui-input-wrap',
        `ui-input-wrap--${size}`,
        focused && 'ui-input-wrap--focused',
        error && 'ui-input-wrap--error',
        wrapClassName
      )}
    >
      {leading && <span className="ui-input-icon">{leading}</span>}
      <input
        ref={ref}
        className={cx('ui-input', className)}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...rest}
      />
      {trailing && <span className="ui-input-suffix">{trailing}</span>}
    </div>
  );
});

export function Field({ label, error, hint, children }) {
  return (
    <label className="ui-field">
      {label && <span className="ui-field-label">{label}</span>}
      {children}
      {error && <span className="ui-field-error">{error}</span>}
      {!error && hint && <span className="ui-field-error" style={{ color: 'var(--text-tertiary)' }}>{hint}</span>}
    </label>
  );
}

export default Input;
