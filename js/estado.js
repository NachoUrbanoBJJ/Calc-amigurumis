import { cargarProyectos, cargarPatrones } from "./planificador.js";
import { cargarInventario } from "./inventario.js";

// ---------------------------------------------------------------------------
// Estado en memoria compartido por toda la app.
// Usar un objeto permite mutarlo desde cualquier módulo (los imports no
// permiten reasignar variables de otro módulo).
// ---------------------------------------------------------------------------
export const estado = {
    // Calculadora
    componentes: [],

    // Proyectos / planificador
    proyectos: cargarProyectos(),
    proyectoActivo: null,
    proyectoSeleccionadoId: null,
    proyectoRevisadoId: null,

    // Patrones
    patrones: cargarPatrones(),
    patronBusqueda: "",
    patronCategoriaFiltro: "",
    patronRevisadoId: null,
    patronEditandoId: null,
    materialesForm: [],

    // Inventario
    inventario: cargarInventario(),
};

// ---------------------------------------------------------------------------
// Configuración persistente (valores por defecto)
// ---------------------------------------------------------------------------
const STORAGE_KEY_CONFIG = "calc-amigurumis-config-v1";

export function cargarConfig() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}") || {};
    } catch {
        return {};
    }
}

export function guardarConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
        console.warn("No se pudo guardar la configuración", e);
    }
}

/**
 * Precarga el valor por hora la última vez usado (si el campo está vacío).
 */
export function aplicarValorHoraPorDefecto() {
    const input = document.getElementById("valorHoras");
    if (!input || input.value !== "") return;
    const config = cargarConfig();
    if (config.valorHora) input.value = String(config.valorHora);
}
