// ---------------------------------------------------------------------------
// Utilidades de DOM y formato compartidas por toda la app.
// ---------------------------------------------------------------------------

/**
 * Escapa texto para insertarlo de forma segura dentro de HTML.
 */
export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
}

export function num(id) {
    return Number(document.getElementById(id).value) || 0;
}

export function texto(id) {
    return document.getElementById(id).value.trim();
}

export function valor(id) {
    return document.getElementById(id).value;
}

export function normalizar(t) {
    return String(t == null ? "" : t)
        .trim()
        .toLowerCase();
}

export function limpiarCampos(ids) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

/**
 * Cambia la sección visible (Calculadora / Inventario / Planificador / ...).
 */
export function irASeccion(nombre) {
    document.querySelectorAll(".nav-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.section === nombre);
    });
    document.querySelectorAll(".section").forEach((s) => {
        s.classList.toggle("active", s.id === `section-${nombre}`);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Dispara la descarga de un archivo JSON en el navegador.
 */
export function descargarJson(nombreArchivo, datos) {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
}
