/**
 * Logo for the three branded sections (left nav, header/hero, login panel).
 * stratifyit → the StratifyIT lockup already shipped in each repo's public/brand/.
 * neutral    → the install's logo from branding.json, else an initials tile in the theme primary.
 */
import { useBrand, suiteName } from './brand'

export function BrandLogo({ on = 'dark', height = 24 }: { on?: 'dark' | 'light'; height?: number }) {
  const { brand, file } = useBrand()
  const base = import.meta.env.BASE_URL
  if (brand === 'stratifyit') {
    return <img src={`${base}brand/${on === 'dark' ? 'logo-full-white' : 'logo-full'}.svg`} alt="StratifyIT.ai" style={{ height, display: 'block' }} />
  }
  const logo = on === 'dark' ? file.theme?.logoDark ?? file.theme?.logo : file.theme?.logo
  const name = suiteName()
  if (logo) return <img src={`${base}branding/${logo}`} alt={name} style={{ height, display: 'block' }} />
  const initials = (name || 'ES').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: height + 6, height: height + 6, borderRadius: 6, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: Math.round(height * 0.5),
        background: on === 'dark' ? '#fff' : 'var(--t-primary)', color: on === 'dark' ? 'var(--t-primary)' : '#fff' }}>{initials}</span>
      {name && <span style={{ fontFamily: 'var(--t-font-display)', fontWeight: 600, fontSize: 15, color: on === 'dark' ? '#fff' : 'var(--t-ink)' }}>{name}</span>}
    </span>
  )
}
