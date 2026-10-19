import { cargarProyectos, cargarPatrones } from "./planificador.js";
import { cargarInventario } from "./inventario.js";
import { cargarCategorias } from "./categorias.js";
import { storageDisponible } from "./almacenamiento.js";
import { cargarConfig, guardarConfig } from "./config.js";

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

    // Categorías de componentes (calculadora / inventario)
    categorias: cargarCategorias(),
};

// ---------------------------------------------------------------------------
// Configuración persistente (valores por defecto)
// ---------------------------------------------------------------------------

// Se reexportan para mantener el API usado por la calculadora.
export { cargarConfig, guardarConfig };

/**
 * Indica si el navegador pudo inicializar el estado persistente.
 * Si es false, conviene avisar que los datos no se guardarán.
 */
export const almacenamientoOk = storageDisponible();

/**
 * Precarga el valor por hora la última vez usado (si el campo está vacío).
 */
export function aplicarValorHoraPorDefecto() {
    const input = document.getElementById("valorHoras");
    if (!input || input.value !== "") return;
    const config = cargarConfig();
    if (config.valorHora) input.value = String(config.valorHora);
}
