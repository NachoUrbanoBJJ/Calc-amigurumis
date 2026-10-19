import { estado } from "./estado.js";
import { descargarJson, esObjeto } from "./utils.js";
import { normalizarPatrones, normalizarProyecto, guardarPatrones, guardarProyectos } from "./planificador.js";
import { guardarInventario, normalizarInventario } from "./inventario.js";
import { renderAll } from "./render.js";
import { confirmar, mostrarAviso } from "./modal.js";

// ---------------------------------------------------------------------------
// Backup completo (inventario + proyectos + patrones)
// ---------------------------------------------------------------------------
const btnExportarTodo = document.getElementById("btnExportarTodo");
if (btnExportarTodo) {
    btnExportarTodo.addEventListener("click", () => {
        descargarJson(`backup-amigurumis-${Date.now()}.json`, {
            version: 2,
            inventario: estado.inventario,
            patrones: estado.patrones,
            proyectos: estado.proyectos,
        });
    });
}

/**
 * Junta los proyectos de un backup: formato nuevo (`proyectos`) o, si no está,
 * los formatos viejos (`proyectosPlan` / `proyectosGuardados`).
 * Devuelve null si el backup no trae proyectos (así se conservan los actuales).
 */
function extraerProyectos(data) {
    if (Array.isArray(data.proyectos)) return data.proyectos;
    const plan = Array.isArray(data.proyectosPlan) ? data.proyectosPlan : [];
    const guardados = Array.isArray(data.proyectosGuardados) ? data.proyectosGuardados : [];
    if (plan.length || guardados.length) return plan.concat(guardados);
    return null;
}

const inputImportarTodo = document.getElementById("inputImportarTodo");
if (inputImportarTodo) {
    inputImportarTodo.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!esObjeto(data)) throw new Error("Formato inválido");

                const ok = await confirmar(
                    "Esto reemplazará tus datos actuales (inventario, proyectos y patrones). ¿Continuar?",
                    { titulo: "Importar backup", ok: "Sí, reemplazar" }
                );
                if (!ok) {
                    e.target.value = "";
                    return;
                }

                const resumen = [];

                if (data.inventario != null) {
                    estado.inventario = normalizarInventario(data.inventario);
                    resumen.push(
                        `${estado.inventario.lanas.length} lanas, ${estado.inventario.rellenos.length} rellenos, ${estado.inventario.componentes.length} componentes`
                    );
                }
                if (Array.isArray(data.patrones)) {
                    estado.patrones = normalizarPatrones(data.patrones);
                    resumen.push(`${estado.patrones.length} patrones`);
                }

                const proyectosImport = extraerProyectos(data);
                if (proyectosImport !== null) {
                    estado.proyectos = proyectosImport.filter(esObjeto).map(normalizarProyecto);
                    resumen.push(`${estado.proyectos.length} proyectos`);
                }

                estado.proyectoActivo = null;
                estado.proyectoSeleccionadoId = null;
                estado.proyectoRevisadoId = null;
                estado.patronRevisadoId = null;
                estado.patronEditandoId = null;
                estado.materialesForm = [];

                guardarInventario(estado.inventario);
                guardarPatrones(estado.patrones);
                guardarProyectos(estado.proyectos);

                renderAll();
                await mostrarAviso(
                    resumen.length
                        ? `Backup importado: ${resumen.join(", ")}.`
                        : "El backup no contenía datos reconocibles.",
                    { titulo: "Importación terminada" }
                );
            } catch {
                await mostrarAviso("No se pudo importar el archivo. Tiene que ser un JSON de backup válido.", {
                    titulo: "Archivo inválido",
                });
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}
