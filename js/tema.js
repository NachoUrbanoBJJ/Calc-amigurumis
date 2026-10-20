import { cargarConfig, actualizarConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Tema claro / oscuro / automático.
// El atributo data-tema se aplica antes del primer pintado desde index.html;
// este módulo se encarga del botón, del color de la barra del navegador y de
// recordar la elección.
// ---------------------------------------------------------------------------
const TEMAS = ["auto", "claro", "oscuro"];
const ETIQUETAS = { auto: "automático", claro: "claro", oscuro: "oscuro" };
const ICONOS = { auto: "🌓", claro: "☀️", oscuro: "🌙" };

const boton = document.getElementById("btnTema");
const metaTema = document.querySelector('meta[name="theme-color"]');
const mediaOscura =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

function temaValido(tema) {
    return TEMAS.includes(tema) ? tema : "auto";
}

function temaActual() {
    return temaValido(cargarConfig().tema);
}

function esOscuro(tema) {
    return tema === "oscuro" || (tema === "auto" && !!mediaOscura && mediaOscura.matches);
}

function aplicarTema(tema, persistir = true) {
    const valido = temaValido(tema);
    document.documentElement.setAttribute("data-tema", valido);

    if (metaTema) metaTema.setAttribute("content", esOscuro(valido) ? "#171014" : "#b0184a");

    if (boton) {
        boton.textContent = ICONOS[valido];
        boton.setAttribute("aria-label", `Tema ${ETIQUETAS[valido]}. Cambiar tema`);
        boton.setAttribute("title", `Tema ${ETIQUETAS[valido]} (clic para cambiar)`);
    }

    if (persistir) actualizarConfig({ tema: valido });
}

export function iniciarTema() {
    aplicarTema(temaActual(), false);

    if (boton) {
        boton.addEventListener("click", () => {
            const actual = temaActual();
            const siguiente = TEMAS[(TEMAS.indexOf(actual) + 1) % TEMAS.length];
            aplicarTema(siguiente);
        });
    }

    if (mediaOscura) {
        const alCambiar = () => {
            if (temaActual() === "auto") aplicarTema("auto", false);
        };
        if (typeof mediaOscura.addEventListener === "function") mediaOscura.addEventListener("change", alCambiar);
        else if (typeof mediaOscura.addListener === "function") mediaOscura.addListener(alCambiar);
    }
}
