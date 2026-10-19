import { cargarConfig, actualizarConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Utilidades de DOM y formato compartidas por toda la app.
// ---------------------------------------------------------------------------
const SECCIONES = ["calculadora", "inventario", "planificador", "patrones", "backup"];

/**
 * Devuelve la sección sólo si es una de las existentes (evita datos corruptos).
 */
export function esSeccionValida(nombre) {
    return SECCIONES.includes(nombre) ? nombre : "";
}

/**
 * Escapa texto para insertarlo de forma segura dentro de HTML.
 */
export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
}

/**
 * Devuelve el value de un input de forma segura.
 * Si el elemento no existe devuelve "" en vez de lanzar una excepción.
 */
export function valor(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

export function num(id) {
    return Number(valor(id)) || 0;
}

export function texto(id) {
    return valor(id).trim();
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
 * Comprueba que un valor sea un objeto plano (no null ni array).
 * Sirve para descartar datos corruptos importados desde un backup.
 */
export function esObjeto(valor) {
    return !!valor && typeof valor === "object" && !Array.isArray(valor);
}

/**
 * Compara dos números con tolerancia (evita fallar por decimales).
 */
export function casiIgual(a, b, epsilon = 1e-6) {
    return Math.abs(Number(a) - Number(b)) <= epsilon;
}

/**
 * Convierte una fecha ISO en texto local. Devuelve "-" si es inválida.
 */
export function formatearFecha(iso) {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return "-";
    return fecha.toLocaleString("es-AR");
}

/**
 * Cambia la sección visible (Calculadora / Inventario / Planificador / ...)
 * y la guarda para restaurarla la próxima vez que se abra la app.
 */
export function irASeccion(nombre) {
    const seccion = esSeccionValida(nombre);
    if (!seccion) return;

    document.querySelectorAll(".nav-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.section === seccion);
    });
    document.querySelectorAll(".section").forEach((s) => {
        s.classList.toggle("active", s.id === `section-${seccion}`);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });

    actualizarConfig({ ultimaSeccion: seccion });
}

/**
 * Última sección visitada (vacío si no hay o no es válida).
 */
export function obtenerSeccionGuardada() {
    return esSeccionValida(cargarConfig().ultimaSeccion);
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

// ---------------------------------------------------------------------------
// Aviso global no bloqueante (para errores de guardado, etc.)
// ---------------------------------------------------------------------------
let avisoTimer = null;

/**
 * Muestra un mensaje en la barra de avisos superior y lo oculta solo.
 */
export function mostrarAvisoGlobal(mensaje, tipo = "error") {
    const cont = document.getElementById("avisoGlobal");
    if (!cont) return;
    cont.textContent = mensaje;
    cont.className = `aviso-global aviso-${tipo}`;
    cont.style.display = "block";
    if (avisoTimer) clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => {
        cont.style.display = "none";
    }, 9000);
}
