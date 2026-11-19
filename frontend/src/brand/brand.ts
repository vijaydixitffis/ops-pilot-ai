/**
 * Suite theme resolver, UI layer only (no DB, no backend setting).
 * Precedence: URL (?brand=) > shell (postMessage from the parent frame) > file (/branding/branding.json) > env (VITE_DEFAULT_BRAND).
 * If branding.json sets theme.lock = true, the file wins and URL/shell are ignored, so a client install cannot be switched back to StratifyIT.
 *
 * Drop-in for: arb-ai-frontend/src/stores/brandStore.ts, adr-frontend/src/stores/brandStore.ts,
 * and as an extension of stratifyit-enterprise/frontends/packages/auth/src/branding.ts.
 */
import { useSyncExternalStore } from 'react'

export type Brand = 'neutral' | 'stratifyit'
export type BrandSource = 'url' | 'shell' | 'file' | 'env'

export interface BrandingFile {
  theme?: { brand?: Brand; lock?: boolean; primaryColor?: string; accentColor?: string; logo?: string; logoDark?: string; favicon?: string }
  suite?: { name?: string; shortName?: string; footer?: string; supportEmail?: string; poweredBy?: boolean }
  products?: Record<string, { name?: string }>
  shell?: { allowedOrigins?: string[] }
}

export interface BrandState {
  brand: Brand
  source: BrandSource
  locked: boolean
  file: BrandingFile
}

const isBrand = (v: unknown): v is Brand => v === 'neutral' || v === 'stratifyit'
const HEX = /^#[0-9a-fA-F]{6}$/

// This repo's own default is stratifyit (output unchanged); set VITE_DEFAULT_BRAND=neutral to flip.
const envBrand: Brand = import.meta.env.VITE_DEFAULT_BRAND === 'neutral' ? 'neutral' : 'stratifyit'
let state: BrandState = { brand: envBrand, source: 'env', locked: false, file: {} }
let shellBrand: Brand | null = null
const listeners = new Set<() => void>()

const framed = window.parent !== window
const qBrand = (() => { const v = new URLSearchParams(location.search).get('brand'); return isBrand(v) ? v : null })()
// Inside the shell, ?brand= is the shell's initial value: a later postMessage from the shell replaces it.
if (framed && qBrand) shellBrand = qBrand

function urlBrand(): Brand | null {
  return framed ? null : qBrand
}

function resolve(file: BrandingFile): BrandState {
  const fileBrand = isBrand(file.theme?.brand) ? file.theme!.brand! : null
  const locked = !!file.theme?.lock && !!fileBrand
  if (locked) return { brand: fileBrand!, source: 'file', locked, file }
  const u = urlBrand()
  if (u) return { brand: u, source: 'url', locked, file }
  if (shellBrand) return { brand: shellBrand, source: 'shell', locked, file }
  if (fileBrand) return { brand: fileBrand, source: 'file', locked, file }
  return { brand: envBrand, source: 'env', locked, file }
}

function apply(next: BrandState) {
  state = next
  const root = document.documentElement
  root.dataset.brand = next.brand
  const t = next.file.theme ?? {}
  const neutral = next.brand === 'neutral'
  if (neutral && HEX.test(t.primaryColor ?? '')) root.style.setProperty('--brand-primary', t.primaryColor!)
  else root.style.removeProperty('--brand-primary')
  if (neutral && HEX.test(t.accentColor ?? '')) root.style.setProperty('--brand-accent', t.accentColor!)
  else root.style.removeProperty('--brand-accent')
  listeners.forEach(l => l())
}

/** Call once before first render. Never throws; a missing file leaves the env default. */
export async function initBrand(): Promise<BrandState> {
  apply(resolve({}))                      // URL / env immediately, no flash
  let file: BrandingFile = {}
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}branding/branding.json`, { cache: 'no-store' })
    if (res.ok && !(res.headers.get('content-type') ?? '').includes('text/html')) file = await res.json()
  } catch { /* keep defaults */ }
  apply(resolve(file))

  // Shell → product. Only accept messages from the parent frame and, if listed, from allowed origins.
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return
    const allowed = state.file.shell?.allowedOrigins
    if (allowed?.length && !allowed.includes(e.origin)) return
    const d = e.data as { type?: string; brand?: unknown }
    if (d?.type === 'suite:brand' && isBrand(d.brand)) { shellBrand = d.brand; apply(resolve(state.file)) }
  })
  return state
}

export const brandState = () => state
export const isNeutral = () => state.brand === 'neutral'

/** Display name of a product: client override in neutral, generic fallback, own name in stratifyit. */
export function productName(code: string, own: string, generic: string): string {
  if (state.brand === 'stratifyit') return own
  return state.file.products?.[code]?.name?.trim() || generic
}

export function suiteName(): string {
  return state.brand === 'stratifyit' ? 'StratifyIT.ai' : (state.file.suite?.name?.trim() || '')
}

/** Footer line. StratifyIT keeps today's text; neutral never shows a StratifyIT line. */
export function footerText(year = new Date().getFullYear()): string {
  if (state.brand === 'stratifyit') return `© ${year} StratifyIT.ai. All rights reserved.`
  const custom = state.file.suite?.footer?.trim()
  if (custom && !/stratifyit/i.test(custom)) return custom
  const name = suiteName()
  return `© ${year} ${name ? name + '. ' : ''}All rights reserved.`
}

export const showPoweredBy = () => state.brand === 'neutral' && state.file.suite?.poweredBy === true

export function useBrand(): BrandState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state,
  )
}
