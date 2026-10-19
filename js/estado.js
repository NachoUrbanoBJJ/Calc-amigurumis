import { cargarProyectos, cargarPatrones } from "./planificador.js";
import { cargarInventario } from "./inventario.js";
import { leerJson, guardarJson, storageDisponible } from "./almacenamiento.js";

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

/**
 * Indica si el navegador pudo inicializar el estado persistente.
 * Si es false, conviene avisar que los datos no se guardarán.
 */
export const almacenamientoOk = storageDisponible();

export function cargarConfig() {
    const config = leerJson(STORAGE_KEY_CONFIG, {});
    return config && typeof config === "object" ? config : {};
}

export function guardarConfig(config) {
    return guardarJson(STORAGE_KEY_CONFIG, config);
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
