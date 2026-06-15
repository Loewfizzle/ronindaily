/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// ── Push notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  let title = 'Ronin Daily'
  let body  = 'Your daily mission awaits.'
  let url   = 'https://ronindaily.app'

  if (event.data) {
    try {
      const payload = event.data.json() as { title?: string; body?: string; url?: string }
      if (payload.title) title = payload.title
      if (payload.body)  body  = payload.body
      if (payload.url)   url   = payload.url
    } catch { /* malformed payload — use defaults */ }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const target = (event.notification.data as { url?: string } | null)?.url ?? 'https://ronindaily.app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url === target && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
