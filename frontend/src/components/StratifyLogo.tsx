// StratifyIT.ai wordmark — rendered from the design system's Logo
// component pattern (SVG mark + Syne wordmark), not a static image.
export function StratifyLogo({
  size = 20,
  fontSize = 16,
  on = 'dark',
}: {
  size?: number
  fontSize?: number
  on?: 'dark' | 'light'
}) {
  const textColor = on === 'dark' ? '#ffffff' : 'var(--slate)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.35) }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="14" width="20" height="4" rx="2" fill="var(--sky-deep)" />
        <rect x="5" y="9" width="14" height="4" rx="2" fill="var(--sky)" />
        <rect x="8" y="4" width="8" height="4" rx="2" fill="var(--sky-bright)" />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize,
          color: textColor,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        StratifyIT<span style={{ color: 'var(--sky-bright)' }}>.ai</span>
      </span>
    </span>
  )
}
