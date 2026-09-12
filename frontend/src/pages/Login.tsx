import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemo } from '../state/DemoStore'
import { StratifyLogo } from '../components/StratifyLogo'
import zenartLogo from '../assets/zenart-logo.png'
import { supabase, fetchProfile } from '../lib/supabaseClient'

export function Login() {
  const demo = useDemo()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          padding: 24,
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
            L1 support workflow automation — proof of concept
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
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              navigate('/simulator')
            }}
            style={{ font: 'var(--t-small)', color: 'var(--fgd-3)', textDecoration: 'underline' }}
          >
            Open external systems simulator →
          </a>
        </div>
      </div>
    </div>
  )
}
