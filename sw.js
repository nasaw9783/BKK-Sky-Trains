/* BTS Live Map — service worker
 * - App shell (bts-map.html + icon + manifest) ใช้ได้แม้เน็ตหลุด
 * - หน้าเว็บ: network-first (เห็นเวอร์ชันใหม่ก่อน) แล้ว fallback cache ตอนออฟไลน์
 * - ไฟล์ static (ฟอนต์/สคริปต์ CDN): stale-while-revalidate ให้โหลดซ้ำเร็วขึ้น
 * - คำขอ API ขบวนรถ (POST ข้ามโดเมน) ปล่อยผ่าน ไม่แตะ — ข้อมูลสดต้องมาจากเน็ตเสมอ
 */
const VERSION = 'bts-v2';
const SHELL_CACHE = 'bts-shell-' + VERSION;
const RUNTIME_CACHE = 'bts-runtime-' + VERSION;

// ไฟล์หลักของแอป (same-origin)
const SHELL_URLS = [
    '/',
    '/index.html',
    '/js/app.js',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-48.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/icon.svg',
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
        )).then(() => self.clients.claim())
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
            fetch(req).catch(() => caches.match('/index.html'))
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
