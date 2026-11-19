/** Footer line for every product. Drop in where the hard-coded "© … StratifyIT.ai" line is today; keep the host's own styling. */
import { useBrand, footerText, showPoweredBy } from './brand'

export function BrandFooter({ style }: { style?: React.CSSProperties }) {
  useBrand()   // re-render when the theme changes
  return (
    <footer style={{ padding: '10px 24px', textAlign: 'center', fontSize: 11.5, color: 'var(--t-muted)', background: 'var(--t-surface)', borderTop: '1px solid var(--t-line)', ...style }}>
      {footerText()}
      {showPoweredBy() && <span> · Powered by StratifyIT.ai</span>}
    </footer>
  )
}
