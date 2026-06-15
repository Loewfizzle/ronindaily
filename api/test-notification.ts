// Node.js runtime — web-push requires Node.js crypto (not Edge-compatible)
// Testing endpoint only — not exposed in the UI

import webpush from 'web-push'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

interface RequestBody {
  user_id: string
}

interface SubRow {
  endpoint: string
  p256dh: string
  auth: string
}

export default async function handler(req: Request): Promise<Response> {
  const secret = (req.headers as unknown as Record<string, string | undefined>)['x-cron-secret']
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  const vapidPub  = process.env.VAPID_PUBLIC_KEY  ?? ''
  const vapidPriv = process.env.VAPID_PRIVATE_KEY ?? ''
  if (!vapidPub || !vapidPriv) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    vapidPub,
    vapidPriv,
  )

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  let userId: string
  try {
    const body = await req.json() as RequestBody
    if (!body.user_id?.trim()) throw new Error('Missing user_id')
    userId = body.user_id.trim()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const SB_HEADERS = {
    apikey:         SUPABASE_KEY,
    Authorization:  `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept:         'application/vnd.pgrst.object+json',
  }

  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&is_active=eq.true&select=endpoint,p256dh,auth`,
    { headers: SB_HEADERS },
  )

  if (!subRes.ok || subRes.status === 406) {
    return new Response(JSON.stringify({ error: 'No active subscription found for this user' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }

  const sub = await subRes.json() as SubRow | null
  if (!sub?.endpoint) {
    return new Response(JSON.stringify({ error: 'No active subscription found for this user' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: 'RONIN DAILY',
        body:  'Push notifications are active. Your mission continues.',
        url:   'https://ronindaily.app',
      }),
    )
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    return new Response(JSON.stringify({ error: 'Failed to send notification', statusCode }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }
}
