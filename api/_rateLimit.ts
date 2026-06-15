// Shared rate-limit helper for Vercel Edge functions.
// Reads and increments the api_usage table in Supabase via the REST API.

declare const process: { env: Record<string, string | undefined> }

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  ?? process.env.SUPABASE_URL  ?? ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

const LIMITS: Record<string, number> = {
  meal_plan_full:  3,
  meal_plan_slot:  10,
  grocery_list:    3,
  cheat_estimate:  10,
}

function today(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

async function getCount(userId: string, action: string, date: string): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/api_usage?user_id=eq.${userId}&action=eq.${action}&usage_date=eq.${date}&select=count`
  const res = await fetch(url, {
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return 0
  const rows = await res.json() as Array<{ count: number }>
  return rows[0]?.count ?? 0
}

async function incrementCount(userId: string, action: string, date: string): Promise<void> {
  // Upsert: insert with count=1 or increment existing count
  const url = `${SUPABASE_URL}/rest/v1/api_usage`
  await fetch(url, {
    method: 'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates',
    },
    body: JSON.stringify({ user_id: userId, action, usage_date: date, count: 1 }),
  })

  // Supabase doesn't support "increment on conflict" via REST upsert directly,
  // so we do an explicit RPC-style update if the row already existed (count > 1 means it did).
  const current = await getCount(userId, action, date)
  if (current > 1) return // upsert already merged; we need to actually increment
  // If count is still 1 after merge, either this is the first call (correct) or the merge
  // didn't increment. Use a PATCH to set count = count + 1 only when count > 1 would be stale.
  // Simplest correct approach: always do a PATCH increment after the insert succeeds.
}

// Proper implementation using two-step: check then increment via PATCH
async function upsertIncrement(userId: string, action: string, date: string): Promise<void> {
  const existing = await getCount(userId, action, date)
  if (existing === 0) {
    // Insert fresh row
    await fetch(`${SUPABASE_URL}/rest/v1/api_usage`, {
      method: 'POST',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, action, usage_date: date, count: 1 }),
    })
  } else {
    // Increment existing row
    await fetch(
      `${SUPABASE_URL}/rest/v1/api_usage?user_id=eq.${userId}&action=eq.${action}&usage_date=eq.${date}`,
      {
        method: 'PATCH',
        headers: {
          apikey:         SUPABASE_KEY,
          Authorization:  `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: existing + 1 }),
      },
    )
  }
}

export interface RateLimitResult {
  allowed: boolean
  limitReached: boolean
}

export async function checkAndIncrement(userId: string, action: string): Promise<RateLimitResult> {
  const limit = LIMITS[action]
  if (!limit || !SUPABASE_URL || !SUPABASE_KEY) return { allowed: true, limitReached: false }

  try {
    const date    = today()
    const current = await getCount(userId, action, date)
    if (current >= limit) return { allowed: false, limitReached: true }
    await upsertIncrement(userId, action, date)
    return { allowed: true, limitReached: false }
  } catch {
    // On error, allow the request through rather than blocking legitimate users
    return { allowed: true, limitReached: false }
  }
}

export function rateLimitExceededResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Daily limit reached. Resets tomorrow.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}
