import { aplicarValorHoraPorDefecto } from "./estado.js";
import { renderInventario } from "./inventario-ui.js";
import { renderProyectoActivo, renderProyectos, renderBannerProyecto } from "./planificador-ui.js";
import { renderPatrones, renderMaterialesForm } from "./patrones-ui.js";
import { renderCategorias } from "./categorias-ui.js";

/**
 * Vuelve a dibujar todas las secciones de la app.
 */
export function renderAll() {
    renderInventario();
    renderCategorias();
    renderProyectoActivo();
    renderProyectos();
    renderPatrones();
    renderMaterialesForm();
    renderBannerProyecto();
    aplicarValorHoraPorDefecto();
}
