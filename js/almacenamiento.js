// ---------------------------------------------------------------------------
// Acceso a localStorage con manejo de errores.
// Centraliza lectura/escritura para no perder datos en silencio ni romper la
// app cuando el almacenamiento está lleno, bloqueado o corrupto.
// ---------------------------------------------------------------------------

/**
 * Evento que se dispara (en window) cuando falla un guardado.
 * El arranque de la app lo escucha para avisar al usuario.
 */
export const EVENTO_ERROR_STORAGE = "amigurumis:storage-error";

/**
 * Lee y parsea una clave de localStorage.
 * Devuelve `porDefecto` si la clave no existe, está corrupta o el acceso falla.
 */
export function leerJson(clave, porDefecto = null) {
    try {
        const raw = localStorage.getItem(clave);
        if (raw == null) return porDefecto;
        const dato = JSON.parse(raw);
        return dato == null ? porDefecto : dato;
    } catch (error) {
        console.error(`No se pudo leer "${clave}"`, error);
        return porDefecto;
    }
}

/**
 * Serializa y guarda un valor en localStorage.
 * Devuelve true si se guardó; false si falló (y avisa vía evento).
 */
export function guardarJson(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify(datos));
        return true;
    } catch (error) {
        console.error(`No se pudo guardar "${clave}"`, error);
        notificarErrorStorage(clave, error);
        return false;
    }
}

/**
 * Comprueba si localStorage está disponible (por ejemplo, en modo privado
 * de algunos navegadores puede no estarlo).
 */
export function storageDisponible() {
    try {
        const clave = "__amigurumis_test__";
        localStorage.setItem(clave, "1");
        localStorage.removeItem(clave);
        return true;
    } catch {
        return false;
    }
}

function notificarErrorStorage(clave, error) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    try {
        window.dispatchEvent(new CustomEvent(EVENTO_ERROR_STORAGE, { detail: { clave, error } }));
    } catch {
        // Entornos sin CustomEvent: nos quedamos con el console.error.
    }
}
