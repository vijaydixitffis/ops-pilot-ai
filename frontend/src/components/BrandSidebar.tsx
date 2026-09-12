import type { ReactNode } from 'react'
import { StratifyLogo } from './StratifyLogo'
import zenartLogo from '../assets/zenart-logo.png'

/** The dark OpsPilot AI / co-brand sidebar, reused by AppShell (with nav
 * items) and the external systems simulator (without any). */
export function BrandSidebar({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--ink)',
        color: 'var(--fgd-2)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        boxSizing: 'border-box',
        gap: 2,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '0 8px 20px 8px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 17,
            color: '#fff',
          }}
        >
          OpsPilot AI
        </span>
        <span style={{ fontSize: 10, color: 'var(--fgd-3)' }}>by</span>
        <img
          src={zenartLogo}
          alt="Zen &amp; Art"
          style={{
            height: 26,
            width: 'auto',
            display: 'block',
            background: '#fff',
            borderRadius: 4,
            padding: '3px 8px',
            alignSelf: 'flex-start',
          }}
        />
        <div style={{ marginTop: 2 }}>
          <StratifyLogo size={22} fontSize={15} on="dark" />
        </div>
      </div>

      {children}
    </div>
  )
}
