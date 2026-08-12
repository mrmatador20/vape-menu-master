/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

const IMAGE_CACHE = 'fox-images-v1';

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== IMAGE_CACHE && k.startsWith('fox-images-')).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first agressivo para imagens transformadas do Supabase Storage
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isStorageImage =
    url.pathname.includes('/storage/v1/render/image/public/') ||
    url.pathname.includes('/storage/v1/object/public/');
  if (!isStorageImage) return;

  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let data = { title: 'Fox Velour', body: 'Nova notificação' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    // Som de alerta (suportado em navegadores que implementam a opção)
    sound: data.sound || '/sounds/order-alert.mp3',
    vibrate: data.vibrate || [500, 110, 500, 110, 500],
    requireInteraction: data.requireInteraction !== false,
    tag: data.tag || 'new-order',
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      sound: data.sound || '/sounds/order-alert.mp3',
    },
    actions: data.actions || [{ action: 'open', title: 'Ver pedido' }],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, options);

      // Se houver alguma aba aberta do painel, pede para ela tocar o som
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({ type: 'PLAY_ORDER_ALERT', sound: options.data.sound });
      }
    })()
  );
});


self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
