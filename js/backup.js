import { estado } from "./estado.js";
import { descargarJson } from "./utils.js";
import { normalizarPatrones, normalizarProyecto, guardarPatrones, guardarProyectos } from "./planificador.js";
import { guardarInventario } from "./inventario.js";
import { renderAll } from "./render.js";

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

const inputImportarTodo = document.getElementById("inputImportarTodo");
if (inputImportarTodo) {
    inputImportarTodo.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data || typeof data !== "object") throw new Error("Formato inválido");

                if (!confirm("Esto reemplazará tus datos actuales (inventario, proyectos y patrones). ¿Continuar?")) {
                    e.target.value = "";
                    return;
                }

                if (data.inventario) {
                    estado.inventario = {
                        lanas: Array.isArray(data.inventario.lanas) ? data.inventario.lanas : [],
                        rellenos: Array.isArray(data.inventario.rellenos) ? data.inventario.rellenos : [],
                        componentes: Array.isArray(data.inventario.componentes) ? data.inventario.componentes : [],
                    };
                }
                if (Array.isArray(data.patrones)) estado.patrones = normalizarPatrones(data.patrones);

                const proyectosImport =
                    data.proyectos || [].concat(data.proyectosPlan || [], data.proyectosGuardados || []);
                if (Array.isArray(proyectosImport) && proyectosImport.length) {
                    estado.proyectos = proyectosImport.map(normalizarProyecto);
                }

                estado.proyectoActivo = null;
                estado.proyectoSeleccionadoId = null;
                estado.proyectoRevisadoId = null;
                estado.patronRevisadoId = null;
                estado.patronEditandoId = null;

                guardarInventario(estado.inventario);
                guardarPatrones(estado.patrones);
                guardarProyectos(estado.proyectos);

                renderAll();
                alert("Backup importado correctamente");
            } catch {
                alert("Archivo JSON inválido");
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}
