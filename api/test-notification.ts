// Node.js runtime — web-push requires Node.js crypto (not Edge-compatible)
// Testing endpoint only — not exposed in the UI

import { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

interface SubRow {
  endpoint: string
  p256dh: string
  auth: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const secret = req.headers['x-cron-secret']
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const vapidPub  = process.env.VAPID_PUBLIC_KEY  ?? ''
  const vapidPriv = process.env.VAPID_PRIVATE_KEY ?? ''
  if (!vapidPub || !vapidPriv) {
    res.status(500).json({ error: 'VAPID keys not configured' })
    return
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    vapidPub,
    vapidPriv,
  )

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let userId: string
  try {
    const body = req.body as { user_id?: string }
    if (!body.user_id?.trim()) throw new Error('Missing user_id')
    userId = body.user_id.trim()
  } catch {
    res.status(400).json({ error: 'Invalid request body' })
    return
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
    res.status(404).json({ error: 'No active subscription found for this user' })
    return
  }

  const sub = await subRes.json() as SubRow | null
  if (!sub?.endpoint) {
    res.status(404).json({ error: 'No active subscription found for this user' })
    return
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
    res.status(200).json({ ok: true })
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    res.status(502).json({ error: 'Failed to send notification', statusCode })
  }
}
