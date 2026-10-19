import { aplicarValorHoraPorDefecto } from "./estado.js";
import { renderInventario } from "./inventario-ui.js";
import { renderProyectoActivo, renderProyectos, renderBannerProyecto } from "./planificador-ui.js";
import { renderPatrones, renderMaterialesForm } from "./patrones-ui.js";

/**
 * Vuelve a dibujar todas las secciones de la app.
 */
export function renderAll() {
    renderInventario();
    renderProyectoActivo();
    renderProyectos();
    renderPatrones();
    renderMaterialesForm();
    renderBannerProyecto();
    aplicarValorHoraPorDefecto();
}
