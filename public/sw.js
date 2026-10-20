// ---------------------------------------------------------------------------
// Service Worker: cachea el app shell para que funcione sin conexión.
// Estrategia: cache-first con revalidación en segundo plano.
// ---------------------------------------------------------------------------
const CACHE = "amigurumis-v2";
const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icon.svg",
    "./icon-192.png",
    "./icon-512.png",
    "./fuentes/lora-400-700.woff2",
    "./fuentes/lora-italic-400-600.woff2",
    "./fuentes/caveat-500-700.woff2",
    "./fuentes/nunito-sans-400-800.woff2",
    "./fuentes/nunito-sans-italic-400-700.woff2",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === "basic") {
                        const copia = response.clone();
                        caches.open(CACHE).then((cache) => cache.put(request, copia));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
