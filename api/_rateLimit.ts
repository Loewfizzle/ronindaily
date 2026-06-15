// Shared rate-limit helper for Vercel Edge functions.
// Calls the increment_api_usage Postgres RPC atomically via the Supabase REST API.
//
// REQUIRES SUPABASE_SERVICE_ROLE_KEY — throws (→ 500) if missing, so misconfiguration
// is immediately visible instead of silently allowing all requests through.

declare const process: { env: Record<string, string | undefined> }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const LIMITS: Record<string, number> = {
  meal_plan_full:  3,
  meal_plan_slot:  10,
  grocery_list:    3,
  cheat_estimate:  10,
}

export interface RateLimitResult {
  allowed: boolean
  limitReached: boolean
}

export async function checkAndIncrement(userId: string, action: string): Promise<RateLimitResult> {
  const limit = LIMITS[action]
  if (!limit) return { allowed: true, limitReached: false }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Rate limiting misconfigured: SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_api_usage`, {
      method: 'POST',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_user_id: userId, p_action: action, p_limit: limit }),
    })
    if (!res.ok) throw new Error(`increment_api_usage RPC failed: ${res.status}`)
    const allowed = await res.json() as boolean
    return { allowed, limitReached: !allowed }
  } catch {
    // Transient network/DB error — allow through rather than blocking users
    return { allowed: true, limitReached: false }
  }
}

export function rateLimitExceededResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Daily limit reached. Resets tomorrow.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}
