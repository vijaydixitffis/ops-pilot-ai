// One-off seed script: creates the two POC demo accounts in auth.users and
// their matching profiles row. Run locally only, never in CI/frontend.
//
// Usage:
//   SUPABASE_URL=https://xiacazzntoktcpkkgjps.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<secret> \
//   node supabase/seed/seed_profiles.mjs
//
// Requires: npm install @supabase/supabase-js (run once in supabase/seed/ or repo root)

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function genPassword() {
  return crypto.randomBytes(12).toString('base64url')
}

const accounts = [
  { email: 'founder@StratifyIT.ai', full_name: 'Founder', role: 'admin' },
  { email: 'vijay.dixit@futurefocusit.solutions', full_name: 'Vijay Dixit', role: 'l1' },
]

for (const acct of accounts) {
  const password = genPassword()

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: acct.email,
    password,
    email_confirm: true,
  })

  if (createErr) {
    console.error(`Failed to create ${acct.email}:`, createErr.message)
    continue
  }

  const userId = created.user.id

  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: acct.full_name, role: acct.role })

  if (profileErr) {
    console.error(`Failed to upsert profile for ${acct.email}:`, profileErr.message)
    continue
  }

  console.log(`Created ${acct.role}: ${acct.email}`)
  console.log(`  user id:  ${userId}`)
  console.log(`  password: ${password}`)
}
