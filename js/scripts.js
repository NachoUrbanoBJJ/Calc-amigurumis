// ---------------------------------------------------------------------------
// Punto de entrada de la app.
// Cada módulo registra sus propios handlers al importarse (efectos de import).
// ---------------------------------------------------------------------------
import { irASeccion } from "./utils.js";
import { renderAll } from "./render.js";
import { registrarServiceWorker } from "./pwa.js";
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

// Arranque
renderAll();
registrarServiceWorker();
