import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const arr     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const key  = sub.getKey('p256dh')
    const auth = sub.getKey('auth')
    if (!key || !auth) return false

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
    const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)))

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint: sub.endpoint,
      p256dh,
      auth: authStr,
      is_active: true,
    }, { onConflict: 'user_id' })

    return !error
  } catch {
    return false
  }
}

export async function hasPushSubscription(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export async function updateNotificationTime(userId: string, time: string): Promise<void> {
  await supabase
    .from('push_subscriptions')
    .update({ notification_time: time })
    .eq('user_id', userId)
}
