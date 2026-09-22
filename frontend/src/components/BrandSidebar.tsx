import type { ReactNode } from 'react'

/** The dark OpsPilot AI sidebar, reused by AppShell (with nav items) and
 * the external systems simulator (without any). Co-brand logos live only
 * on the login page, not here. */
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
      </div>

      {children}
    </div>
  )
}
