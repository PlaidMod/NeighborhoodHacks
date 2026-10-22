// ShowUp HTX service worker. It only shows alert notifications (Technical Plan §11):
// no caching and no offline pages. The server sends JSON built by lib/push/message.ts:
// { title, body, url, tag, lang }.

const FALLBACK_PATH = '/app/alerts'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const text = (value) => (typeof value === 'string' ? value : '')
  event.waitUntil(
    self.registration.showNotification(text(data.title) || 'ShowUp HTX', {
      body: text(data.body),
      tag: text(data.tag) || undefined,
      lang: data.lang === 'es' ? 'es' : 'en',
      icon: '/icons/icon-192.png',
      data: { url: text(data.url) || FALLBACK_PATH },
    }),
  )
})

// Opens the alert's page on this site. Only the path is kept, so a notification can never
// send the reader to another site, and links work on preview deployments too.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let target
  try {
    const url = new URL(event.notification.data && event.notification.data.url, self.location.origin)
    target = new URL(url.pathname + url.search, self.location.origin).href
  } catch {
    target = new URL(FALLBACK_PATH, self.location.origin).href
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) if (w.url === target && 'focus' in w) return w.focus()
      return self.clients.openWindow(target)
    }),
  )
})
