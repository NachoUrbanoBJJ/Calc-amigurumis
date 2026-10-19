// ---------------------------------------------------------------------------
// Registro del Service Worker (solo en la build de producción).
// En desarrollo no se registra para no interferir con el HMR de Vite.
// ---------------------------------------------------------------------------
export function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!import.meta.env || !import.meta.env.PROD) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((err) => {
            console.warn("No se pudo registrar el service worker", err);
        });
    });
}
