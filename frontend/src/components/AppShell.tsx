import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDemo } from '../state/DemoStore'
import { BrandSidebar } from './BrandSidebar'

interface NavItem {
  path: string
  label: string
  /** additional paths on which this item shows as active */
  alsoActive?: string[]
}

const L1_NAV: NavItem[] = [
  { path: '/l1/queue', label: 'My queue', alsoActive: ['/l1/ticket'] },
  { path: '/l1/auto', label: 'Auto-resolved' },
]

const ADMIN_NAV: NavItem[] = [
  { path: '/admin/overview', label: 'Overview', alsoActive: ['/admin/audit'] },
  { path: '/admin/history', label: 'Run history' },
  { path: '/admin/vendor-cases', label: 'Vendor cases' },
  { path: '/admin/feedback', label: 'Feedback' },
]

export function AppShell() {
  const demo = useDemo()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isAdmin = demo.role === 'admin'
  const nav = isAdmin ? ADMIN_NAV : L1_NAV
  const roleBadgeText = demo.accountLabel ?? 'Not signed in'
  const simulatorUrl = `${window.location.origin}${window.location.pathname}#/simulator`

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left nav */}
      <BrandSidebar>
        {nav.map((item) => {
          const active =
            pathname === item.path || (item.alsoActive ?? []).some((p) => pathname.startsWith(p))
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
                ...(active
                  ? { background: 'rgba(47,143,219,.15)', color: '#fff', fontWeight: 600 }
                  : { color: 'var(--fgd-2)' }),
              }}
            >
              {item.label}
            </div>
          )
        })}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 18,
            borderTop: '1px solid var(--border-dark)',
          }}
        >
          <a
            href={simulatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--fgd-3)' }}
          >
            External simulator ↗
          </a>
        </div>
      </BrandSidebar>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            height: 64,
            flexShrink: 0,
            background: 'var(--white)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 28px',
            boxSizing: 'border-box',
            gap: 16,
          }}
        >
          <span
            style={{
              font: 'var(--t-small)',
              background: 'var(--sky-50)',
              color: 'var(--sky-deep)',
              padding: '6px 14px',
              borderRadius: 'var(--r-pill)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {roleBadgeText}
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              demo.signOut()
              navigate('/')
            }}
            style={{ fontSize: 13, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}
          >
            Log out
          </a>
        </div>

        <div
          style={{
            flex: 1,
            padding: 32,
            boxSizing: 'border-box',
            maxWidth: 1320,
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}
