import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../state/DemoStore'
import { StratifyLogo } from '../components/StratifyLogo'
import zenartLogo from '../assets/zenart-logo.png'
import { supabase, fetchProfile } from '../lib/supabaseClient'

const FEATURES = [
  {
    icon: '⚡',
    title: 'AI-triaged ticket queue',
    body: 'Incoming tickets are classified, prioritized, and routed automatically — L1 sees what matters first.',
  },
  {
    icon: '🧭',
    title: 'Guided resolution playbooks',
    body: 'Step-by-step, context-aware playbooks walk agents through fixes instead of hunting across wikis.',
  },
  {
    icon: '🔁',
    title: 'Auto-drafted responses',
    body: 'Draft replies and resolution notes are generated from ticket context, ready for a one-click send.',
  },
  {
    icon: '📊',
    title: 'Live ops visibility',
    body: 'Admins get real-time queue health, SLA risk, and agent load — no end-of-day report needed.',
  },
]

const BENEFITS = [
  { value: '↓ 45%', label: 'time to resolution' },
  { value: '↓ 60%', label: 'manual triage effort' },
  { value: '↑ 30%', label: 'first-contact fixes' },
]

export function Login() {
  const demo = useDemo()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Sign In — OpsPilot AI | AI-Powered L1 Support Automation'

    const descriptionTag = document.querySelector('meta[name="description"]')
    const prevDescription = descriptionTag?.getAttribute('content') ?? null
    descriptionTag?.setAttribute(
      'content',
      'Sign in to OpsPilot AI to triage tickets, resolve them with guided playbooks, and monitor your L1 support queue in real time.',
    )

    return () => {
      document.title = prevTitle
      if (prevDescription !== null) descriptionTag?.setAttribute('content', prevDescription)
    }
  }, [])

  const signIn = async () => {
    setAuthError(null)
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const profile = await fetchProfile(data.user.id)
      const label = `Logged in as: ${profile.role === 'admin' ? 'Admin' : 'L1'} — ${profile.full_name}`
      demo.setRole(profile.role, label)
      navigate(profile.role === 'admin' ? '/admin/overview' : '/l1/queue')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(900px 500px at 80% 10%, rgba(47,143,219,.22), transparent 60%), #0d1117',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '22px 32px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 20,
            color: '#fff',
          }}
        >
          OpsPilot AI
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          padding: '24px 32px 48px',
          maxWidth: 1180,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Pitch panel */}
        <div style={{ flex: '1 1 480px', maxWidth: 560, color: '#fff' }}>
          <div
            style={{
              display: 'inline-block',
              font: 'var(--t-mono)',
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--sky-bright)',
              background: 'rgba(47,143,219,.14)',
              border: '1px solid rgba(47,143,219,.3)',
              borderRadius: 'var(--r-pill)',
              padding: '5px 14px',
              marginBottom: 18,
            }}
          >
            L1 Support, on autopilot
          </div>
          <h1
            style={{
              font: 'var(--t-h2)',
              fontFamily: 'var(--font-display)',
              color: '#fff',
              margin: '0 0 14px',
            }}
          >
            Turn your support queue into a self-resolving pipeline
          </h1>
          <p
            style={{
              font: 'var(--t-small)',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--fgd-2)',
              margin: '0 0 32px',
              maxWidth: 480,
            }}
          >
            OpsPilot AI reads, triages, and drafts the fix for every incoming ticket — so your
            L1 team resolves faster and your admins finally see the whole queue at a glance.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 18,
              marginBottom: 32,
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: 'var(--r-sm)',
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 17,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#fff',
                      marginBottom: 3,
                    }}
                  >
                    {f.title}
                  </div>
                  <div style={{ font: 'var(--t-small)', color: 'var(--fgd-3)', lineHeight: 1.5 }}>
                    {f.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 28,
              flexWrap: 'wrap',
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,.1)',
            }}
          >
            {BENEFITS.map((b) => (
              <div key={b.label}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 26,
                    color: 'var(--sky-bright)',
                    lineHeight: 1.1,
                  }}
                >
                  {b.value}
                </div>
                <div style={{ font: 'var(--t-small)', color: 'var(--fgd-3)' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Login panel */}
        <div
          style={{
            flex: '0 1 420px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div
            style={{
              width: 'min(420px, 92vw)',
              background: 'var(--white)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--sh-lg)',
              padding: '40px 36px',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 32,
                  lineHeight: 1.06,
                  color: 'var(--fg-2)',
                }}
              >
                OpsPilot <span style={{ color: 'var(--sky)' }}>AI</span>
              </div>
            </div>
            <div style={{ font: 'var(--t-small)', color: 'var(--fg-3)', marginBottom: 30 }}>
              L1 support workflow automation
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 22,
              }}
            >
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signIn()}
                style={{
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            </div>
            {authError && (
              <div style={{ font: 'var(--t-small)', color: '#c0473a', marginBottom: 14 }}>
                {authError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={signIn}
                disabled={busy}
                style={{
                  width: '100%',
                  height: 48,
                  background: 'var(--sky)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                  boxShadow: 'var(--sh-sky)',
                }}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--fgd-3)' }}>by</span>
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
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--fgd-3)' }}>+</span>
              <StratifyLogo size={20} fontSize={16} on="dark" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
