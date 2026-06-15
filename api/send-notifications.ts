// Node.js runtime — web-push requires Node.js crypto (not Edge-compatible)
// No runtime: 'edge' config — Vercel defaults to Node.js

import webpush from 'web-push'
import { toZonedTime } from 'date-fns-tz'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

// ── Types ────────────────────────────────────────────────────────────────────

interface SubRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  notification_time: string        // HH:MM:SS in user's local timezone
  timezone: string                 // IANA timezone, e.g. 'America/New_York'
  milestone_notifications_sent: string[] | null
}

interface ProfileRow {
  sex: 'M' | 'F'
  age: number
  height_cm: number
  start_weight: number
  goal_weight: number
  target_weeks: number
  start_date: string               // YYYY-MM-DD
}

interface CheckinRow { weight: number }

interface AccountabilityRow { logged_date: string; result: string }

// ── Supabase REST helpers ────────────────────────────────────────────────────

const SB_HEADERS = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

async function sbGet<T>(path: string, single = false): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: single ? { ...SB_HEADERS, Accept: 'application/vnd.pgrst.object+json' } : SB_HEADERS,
  })
  if (!res.ok) return null
  return res.json() as Promise<T>
}

async function sbPatch(table: string, filter: string, body: object): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify(body),
  })
}

// ── Computation helpers ──────────────────────────────────────────────────────

function dayNumber(startDate: string): number {
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1)
}

function calorieTarget(p: ProfileRow, currentWeight: number): number {
  const kg           = currentWeight * 0.453592
  const bmr          = p.sex === 'M'
    ? 10 * kg + 6.25 * p.height_cm - 5 * p.age + 5
    : 10 * kg + 6.25 * p.height_cm - 5 * p.age - 161
  const maint        = bmr * 1.4
  const totalCal     = (p.start_weight - p.goal_weight) * 3500
  const dailyDeficit = Math.min(1000, totalCal / (p.target_weeks * 7))
  return Math.max(1200, Math.round(maint - dailyDeficit))
}

async function streak(userId: string): Promise<number> {
  const rows = await sbGet<AccountabilityRow[]>(
    `daily_accountability?user_id=eq.${userId}&select=logged_date,result&order=logged_date.desc&limit=120`,
  )
  if (!rows?.length) return 0
  const map = new Map(rows.map(r => [r.logged_date, r.result]))
  const cur = new Date()
  cur.setUTCHours(0, 0, 0, 0)
  cur.setUTCDate(cur.getUTCDate() - 1) // start from yesterday — today not logged yet
  let count = 0
  for (let i = 0; i < 120; i++) {
    const key = cur.toISOString().slice(0, 10)
    const r   = map.get(key)
    if (!r || r === 'failed') break
    count++
    cur.setUTCDate(cur.getUTCDate() - 1)
  }
  return count
}

// ── Notification text ────────────────────────────────────────────────────────

const MILESTONES: Record<number, string> = {
  7:   'Seven days. You have not failed. Yet.',
  30:  'Thirty days. Most quit by now. You did not.',
  50:  'Fifty days. Discipline is no longer a choice. It is who you are.',
  100: 'One hundred days. The mission is complete. Begin the next one.',
}

function buildBody(day: number, currentStreak: number, cal: number): string {
  if (currentStreak === 0 && day > 1) return 'Your mission awaits. Begin today.'
  if (day % 7 === 0) return `Day ${day}. Time to weigh in. Log your check-in.`
  return `Day ${day}. ${cal.toLocaleString()} cal. Do not break the chain.`
}

// ── Time window check ────────────────────────────────────────────────────────

function inWindow(notificationTime: string, timezone: string): boolean {
  const now = new Date()
  let localNow: Date
  try {
    localNow = toZonedTime(now, timezone)
  } catch {
    // Unknown timezone — fall back to UTC
    localNow = now
  }
  const nowMin    = localNow.getHours() * 60 + localNow.getMinutes()
  const [h, m]    = notificationTime.split(':').map(Number)
  const targetMin = h * 60 + m
  const diff      = Math.abs(nowMin - targetMin)
  return Math.min(diff, 1440 - diff) <= 5
}

// ── Handler ──────────────────────────────────────────────────────────────────

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

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  const subs = await sbGet<SubRow[]>('push_subscriptions?is_active=eq.true&select=*')
  if (!subs) {
    return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0, failed = 0, skipped = 0

  for (const sub of subs) {
    if (!inWindow(sub.notification_time, sub.timezone ?? 'America/New_York')) {
      skipped++
      continue
    }

    try {
      const profile = await sbGet<ProfileRow>(
        `profiles?id=eq.${sub.user_id}&select=sex,age,height_cm,start_weight,goal_weight,target_weeks,start_date`,
        true,
      )
      if (!profile) { failed++; continue }

      const checkins = await sbGet<CheckinRow[]>(
        `checkins?user_id=eq.${sub.user_id}&select=weight&order=week_number.desc&limit=1`,
      )
      const weight = checkins?.[0]?.weight ?? profile.start_weight

      const day  = dayNumber(profile.start_date)
      const cal  = calorieTarget(profile, weight)
      const str  = await streak(sub.user_id)
      const body = buildBody(day, str, cal)

      const pushSub: webpush.PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }

      await webpush.sendNotification(pushSub, JSON.stringify({
        title: 'RONIN DAILY', body, url: 'https://ronindaily.app',
      }))
      sent++

      // Milestone — second push on milestone days, once only
      const milestoneMsg = MILESTONES[day]
      if (milestoneMsg) {
        const sentMs = sub.milestone_notifications_sent ?? []
        if (!sentMs.includes(String(day))) {
          await webpush.sendNotification(pushSub, JSON.stringify({
            title: 'RONIN DAILY', body: milestoneMsg, url: 'https://ronindaily.app',
          }))
          await sbPatch('push_subscriptions', `id=eq.${sub.id}`, {
            milestone_notifications_sent: [...sentMs, String(day)],
          })
        }
      }
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 410) {
        await sbPatch('push_subscriptions', `id=eq.${sub.id}`, { is_active: false })
      }
      failed++
    }
  }

  return new Response(
    JSON.stringify({ sent, failed, skipped, total: subs.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
