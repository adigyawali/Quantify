/**
 * Tickr brand mark.
 *
 * An ascending-tick glyph inside a soft rounded square with the brand
 * gradient. Designed to read at any size from 16px (favicon) to 96px
 * (auth visual).
 */
export function BrandMark({ size = 28, glow = true, className }) {
  const px = `${size}px`;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: px,
        height: px,
        borderRadius: Math.round(size * 0.28),
        background: 'linear-gradient(135deg, #7C5CFF 0%, #22D3EE 100%)',
        boxShadow: glow ? '0 0 24px rgba(124,92,255,0.45)' : 'none',
        flexShrink: 0,
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 16 L9 10 L13 14 L21 5" />
        <circle cx="21" cy="5" r="1.6" fill="white" stroke="none" />
      </svg>
    </span>
  );
}

export default BrandMark;
