/* BTS Live Map — service worker
 * - App shell (bts-map.html + icon + manifest) ใช้ได้แม้เน็ตหลุด
 * - หน้าเว็บ: network-first (เห็นเวอร์ชันใหม่ก่อน) แล้ว fallback cache ตอนออฟไลน์
 * - สคริปต์หลักและสไตล์: network-first เพื่อให้เห็นการอัปเดตทันทีเมื่อออนไลน์
 * - ไฟล์ static อื่นๆ (CDN): stale-while-revalidate ให้โหลดซ้ำเร็วขึ้น
 * - คำขอ API ขบวนรถ (POST ข้ามโดเมน) ปล่อยผ่าน ไม่แตะ — ข้อมูลสดต้องมาจากเน็ตเสมอ
 */
const VERSION = 'bkk-v91';
const SHELL_CACHE = 'bkk-shell-' + VERSION;
const RUNTIME_CACHE = 'bkk-runtime-' + VERSION;

// ไฟล์หลักของแอป (same-origin)
// ไฟล์หลักของแอป (Critical App Shell) - โหลดเร็ว ติดตั้งทันที
const SHELL_URLS = [
    './',
    './index.html',
    './js/app.js',
    './js/jsencrypt.min.js',
    './js/leaflet.js',
    './leaflet.css',
    './manifest.json',
    './icon.svg',
    './images/ic_traffic_alert.svg',
    './images/icon_traffic_information.svg',
    './images/bkk_skytrains_disruption_preview.svg',
    './images/layers.svg',
    './images/layers-2x.svg',
    './images/marker-icon.svg',
    './images/marker-shadow.svg',
];

// ไฟล์เวกเตอร์แผนผังขนาดใหญ่ (~6MB) - แคชในพื้นหลังช่วง activate ไม่บล็อกการติดตั้ง
const LARGE_MEDIA_URLS = [
    './bkk_transit_map.svg',
    './bkk_transit_map_dark.svg',
    './bkk_transit_map.jpg',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL_URLS))
            .then(() => self.skipWaiting())
            .catch(() => { /* ติดตั้งสำเร็จแม้บางไฟล์โหลดไม่ได้ */ })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
                .map(k => caches.delete(k))
        )).then(() => {
            caches.open(SHELL_CACHE).then(cache => cache.addAll(LARGE_MEDIA_URLS)).catch(() => {});
            return self.clients.claim();
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const req = event.request;

    // เฉพาะ GET — API ขบวนรถเป็น POST ปล่อยผ่านให้ยิงเน็ตตรง
    if (req.method !== 'GET') return;

    // เปิดหน้าเว็บ / นำทาง → network-first, ออฟไลน์ค่อยใช้แอปที่ cache ไว้
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('./index.html'))
        );
        return;
    }

    const url = new URL(req.url);

    // ปล่อยผ่านคำขอ API ขบวนรถสด /api/bkk-proxy เสมอ ไม่แตะแคช
    if (url.pathname.includes('/api/bkk-proxy') || url.pathname.includes('/api/')) return;

    // ข้ามคำขอที่ไม่ใช่โปรโตคอล http/https (เช่น chrome-extension://) ป้องกัน Cache API error
    if (!url.protocol.startsWith('http')) return;

    // สคริปต์หลักและสไตล์ชีตของแอป (same-origin app.js, leaflet.css) → network-first เพื่อรับเวอร์ชันล่าสุดเมื่อออนไลน์
    if (url.origin === self.location.origin && (url.pathname.endsWith('app.js') || url.pathname.endsWith('.css'))) {
        event.respondWith(
            fetch(req).then(res => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => { });
                }
                return res;
            }).catch(() => caches.match(req).then(cached => cached || caches.match('./js/app.js')))
        );
        return;
    }

    // ไฟล์ static อื่น ๆ → stale-while-revalidate
    event.respondWith(
        caches.match(req).then(cached => {
            const network = fetch(req).then(res => {
                if (res && (res.ok || res.type === 'opaque')) {
                    const copy = res.clone();
                    caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => { });
                }
                return res;
            }).catch(() => cached);
            return cached || network;
        })
    );
});

// จัดการเมื่อผู้ใช้แตะการแจ้งเตือนจากล็อกหน้าจอหรือแถบแจ้งเตือน
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const stationKey = event.notification.data?.stationKey;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) {
                    if (stationKey && 'postMessage' in client) {
                        client.postMessage({ action: 'openStation', stationKey: stationKey });
                    }
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                const baseUrl = self.registration.scope || './';
                const targetUrl = stationKey ? (baseUrl + '#st=' + encodeURIComponent(stationKey)) : baseUrl;
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
