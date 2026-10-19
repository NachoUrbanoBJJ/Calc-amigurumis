// ---------------------------------------------------------------------------
// Punto de entrada de la app.
// Cada módulo registra sus propios handlers al importarse (efectos de import).
// ---------------------------------------------------------------------------
import { irASeccion, mostrarAvisoGlobal } from "./utils.js";
import { renderAll } from "./render.js";
import { registrarServiceWorker } from "./pwa.js";
import { EVENTO_ERROR_STORAGE } from "./almacenamiento.js";
import { almacenamientoOk } from "./estado.js";
import "./calculadora.js";
import "./inventario-ui.js";
import "./planificador-ui.js";
import "./patrones-ui.js";
import "./backup.js";

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------
document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => irASeccion(btn.dataset.section));
});

// Si la URL trae #seccion (accesos directos de la PWA), abrimos esa sección.
const hash = (location.hash || "").replace("#", "");
if (hash && document.getElementById(`section-${hash}`)) irASeccion(hash);

// ---------------------------------------------------------------------------
// Robustez: avisos de errores de guardado y de arranque
// ---------------------------------------------------------------------------
window.addEventListener(EVENTO_ERROR_STORAGE, () => {
    mostrarAvisoGlobal(
        "⚠️ No se pudieron guardar los datos (almacenamiento lleno o bloqueado). Exportá un backup.",
        "error"
    );
});

// Arranque
try {
    renderAll();
} catch (error) {
    console.error("Error al iniciar la app", error);
    mostrarAvisoGlobal("⚠️ Hubo un problema al cargar los datos. Recargá la página.", "error");
}

if (!almacenamientoOk) {
    mostrarAvisoGlobal(
        "⚠️ Tu navegador no permite guardar datos: lo que cargues se perderá al cerrar. Probá salir del modo privado.",
        "error"
    );
}

registrarServiceWorker();
