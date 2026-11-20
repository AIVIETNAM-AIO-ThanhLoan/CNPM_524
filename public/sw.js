/* global self, caches, indexedDB */
const CACHE = 'tingting-static-v10';
let preparingOffline;
// Chuẩn hóa một đoạn URL; gặp chuỗi % không hợp lệ thì giữ nguyên để không làm hỏng cả bước cài đặt.
function normalizeSegment(part) {
    try { return encodeURIComponent(decodeURIComponent(part)); } catch { return part; }
}
function prepareOffline() {
    if (preparingOffline) return preparingOffline;
    preparingOffline = (async () => {
        const cache = await caches.open(CACHE);
        const response = await fetch('/offline', { cache: 'reload' });
        if (!response.ok) throw new Error('Offline shell unavailable');
        const html = await response.clone().text();
        const assets = (source) => [...source.matchAll(/["']((?:\/_next\/)?static\/(?:chunks|media)\/[^"'\\\s<>?]+\.(?:js|css|woff2?))\\?["']/g)]
            .map((match) => {
                const path = match[1].startsWith('/') ? match[1] : `/_next/${match[1]}`;
                return path.replaceAll('&amp;', '&').split('/').map(normalizeSegment).join('/');
            });
        const visited = new Set();
        async function save(url) {
            if (visited.has(url)) return;
            visited.add(url);
            // Dev chunks can keep their URL while their contents and dependencies change.
            const file = await fetch(url, { cache: 'reload' });
            if (!file.ok) throw new Error(`Offline asset unavailable: ${url}`);
            if (url.endsWith('.js') || url.endsWith('.css')) {
                await Promise.all(assets(await file.clone().text()).map(save));
            }
            await cache.put(url, file);
        }
        // Turbopack loaders reference additional chunks absent from the HTML script tags.
        await Promise.all([...assets(html), '/icon-192.png', '/icon-512.png'].map(save));
        // Publish the shell only after all files needed to start it are available.
        await cache.put('/offline', response);
    })().finally(() => { preparingOffline = null; });
    return preparingOffline;
}
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        await prepareOffline();
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
        event.respondWith((async () => {
            try {
                const response = await fetch(event.request);
                if (response.ok) event.waitUntil(prepareOffline().catch(() => { /* Keep the last complete shell. */ }));
                return response;
            } catch {
                return (await caches.match('/offline')) || Response.error();
            }
        })());
    } else if (url.pathname.startsWith('/_next/static/')) {
        // Ưu tiên mạng: bản dev giữ nguyên tên file khi code đổi, nên chỉ dùng cache khi mất mạng.
        event.respondWith((async () => {
            const cache = await caches.open(CACHE);
            try {
                const response = await fetch(event.request);
                // A previous build's files may return 404 after a deployment.
                if (!response.ok) return (await cache.match(event.request)) || response;
                // Ghi cache ở nền, không bắt trang chờ: mỗi lần mở có hàng chục file.
                event.waitUntil(cache.put(event.request, response.clone()));
                return response;
            } catch (error) {
                const cached = await cache.match(event.request);
                if (cached) return cached;
                throw error;
            }
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
