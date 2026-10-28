/* global self, caches, indexedDB */
const CACHE = 'tingting-static-v1';
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const response = await fetch('/offline', { cache: 'reload' });
        if (!response.ok) throw new Error('Offline shell unavailable');
        const html = await response.clone().text();
        await cache.put('/offline', response);
        const assets = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)].map((match) => match[1].replaceAll('&amp;', '&'))
            .filter((url) => url.startsWith('/_next/static/'));
        await cache.addAll([...new Set([...assets, '/icon-192.png', '/icon-512.png'])]);
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) if (key.startsWith('tingting-static-') && key !== CACHE) await caches.delete(key);
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(async () => (await caches.match('/offline')) || Response.error()));
    } else if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE);
            const cached = await cache.match(event.request);
            if (cached) return cached;
            const response = await fetch(event.request);
            if (response.ok) await cache.put(event.request, response.clone());
            return response;
        })());
    }
});

function pushDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('cnpm-push-seen', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('seen');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
self.addEventListener('push', (event) => {
    event.waitUntil((async () => {
        let payload;
        try { payload = event.data?.json(); } catch { return; }
        if (!payload || !/^[a-f0-9-]{36}$/.test(payload.id)) return;
        // The payload contains no financial details; verify the current session before displaying.
        const me = await fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
        if (me?.user?.id !== payload.userId) return;
        const db = await pushDatabase();
        const seen = await new Promise((resolve, reject) => {
            const tx = db.transaction('seen', 'readonly');
            const request = tx.objectStore('seen').get(payload.id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        if (!seen) {
            await self.registration.showNotification('Ting Ting', { body: 'Bạn có thông báo mới. Mở ứng dụng để xem.', tag: payload.id, icon: '/icon-192.png', data: { url: '/notifications' } });
            await new Promise((resolve, reject) => {
                const tx = db.transaction('seen', 'readwrite');
                tx.objectStore('seen').put(true, payload.id);
                tx.oncomplete = resolve; tx.onerror = reject;
            });
        }
        db.close();
    })());
});
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(self.clients.openWindow('/notifications'));
});
