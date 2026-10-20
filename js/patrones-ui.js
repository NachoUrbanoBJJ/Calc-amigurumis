import { estado } from "./estado.js";
import { escapeHtml, texto, normalizar, limpiarCampos, irASeccion, formatearFecha } from "./utils.js";
import { coincideTexto } from "./inventario.js";
import {
    generarId,
    agregarPatron,
    generarCodigoPatron,
    guardarPatrones,
    eliminarPatron,
    crearProyecto,
    guardarProyectos,
} from "./planificador.js";
import { renderProyectos, abrirEditorProyecto } from "./planificador-ui.js";
import { confirmar, mostrarAviso } from "./modal.js";
import { imprimirPatron, descargarPatronCSV, descargarPatronPNG } from "./exportar.js";

// ---------------------------------------------------------------------------
// Formulario de patrón
// ---------------------------------------------------------------------------
const btnGuardarPatron = document.getElementById("btnGuardarPatron");
if (btnGuardarPatron) {
    btnGuardarPatron.addEventListener("click", async () => {
        const datos = {
            nombre: texto("patronNombre"),
            categoria: texto("patronCategoria"),
            materiales: estado.materialesForm.map((m) => ({ ...m })),
            materialesTexto: texto("patronMateriales"),
            instrucciones: texto("patronInstrucciones"),
        };
        if (!datos.nombre) {
            await mostrarAviso("Escribí un nombre para el patrón.", { titulo: "Falta el nombre" });
            return;
        }

        if (estado.patronEditandoId) {
            const patron = estado.patrones.find((p) => p.id === estado.patronEditandoId);
            if (patron) {
                patron.nombre = datos.nombre;
                patron.categoria = datos.categoria;
                patron.materiales = datos.materiales;
                patron.materialesTexto = datos.materialesTexto;
                patron.instrucciones = datos.instrucciones;
                patron.fechaModificacion = new Date().toISOString();
            }
        } else {
            estado.patrones.push(agregarPatron(datos, generarCodigoPatron(estado.patrones)));
        }

        guardarPatrones(estado.patrones);
        limpiarFormPatron();
        renderPatrones();
    });
}

const btnAgregarMaterialPatron = document.getElementById("btnAgregarMaterialPatron");
if (btnAgregarMaterialPatron) {
    btnAgregarMaterialPatron.addEventListener("click", agregarMaterialPatron);
}

async function agregarMaterialPatron() {
    const nombre = texto("patronMatNombre");
    if (!nombre) {
        await mostrarAviso("Escribí el nombre del material.", { titulo: "Falta el nombre" });
        return;
    }

    const cantidad = Number(document.getElementById("patronMatCantidad").value) || 0;
    if (cantidad < 0) {
        await mostrarAviso("La cantidad no puede ser negativa.", { titulo: "Revisá el dato" });
        return;
    }
    const unidad = texto("patronMatUnidad");

    estado.materialesForm.push({ id: generarId(), nombre, cantidad, unidad });
    limpiarCampos(["patronMatNombre", "patronMatCantidad", "patronMatUnidad"]);
    renderMaterialesForm();
    const input = document.getElementById("patronMatNombre");
    if (input) input.focus();
}

export function renderMaterialesForm() {
    const cont = document.getElementById("listaMaterialesPatron");
    if (!cont) return;
    cont.innerHTML = "";

    if (!estado.materialesForm.length) {
        cont.innerHTML = "<p class='empty-state'>Sin materiales cargados.</p>";
        return;
    }

    estado.materialesForm.forEach((m) => {
        const cantidad = m.cantidad ? `${m.cantidad}${m.unidad ? " " + m.unidad : ""}` : m.unidad || "";
        const fila = document.createElement("div");
        fila.className = "material-item";
        fila.innerHTML = `<span class="material-nombre">${escapeHtml(m.nombre)}</span><span class="material-cantidad">${escapeHtml(cantidad)}</span><button type="button" class="btn-danger" data-del-material="${m.id}" title="Quitar">✕</button>`;
        cont.appendChild(fila);
    });

    cont.querySelectorAll("[data-del-material]").forEach((b) => {
        b.addEventListener("click", () => {
            estado.materialesForm = estado.materialesForm.filter((m) => m.id !== b.dataset.delMaterial);
            renderMaterialesForm();
        });
    });
}

/**
 * Estima si un material del patrón está disponible en el inventario.
 * Compara por nombre (tolerante) contra lanas/rellenos (peso) o componentes (unidades).
 */
function calcularDisponibilidadMaterial(mat) {
    const n = normalizar(mat.nombre);
    if (!n) return { estado: "sin-datos", disponible: 0 };

    const coincide = (t) => coincideTexto(mat.nombre, t) && !!normalizar(t);

    const unidad = normalizar(mat.unidad);
    const esPeso = ["g", "gr", "grs", "gramo", "gramos", "kg"].includes(unidad);
    const esUnidad = ["", "ud", "uds", "unidad", "unidades", "u"].includes(unidad);

    let disponible = 0;
    let hallado = false;

    const inventario = estado.inventario || { lanas: [], rellenos: [], componentes: [] };

    if (esPeso || esUnidad) {
        (inventario.lanas || []).forEach((l) => {
            if (coincide(l.color) || coincide(l.marca)) {
                disponible += Number(l.gramosDisponibles) || 0;
                hallado = true;
            }
        });
        (inventario.rellenos || []).forEach((r) => {
            if (coincide(r.tipo) || coincide(r.marca)) {
                disponible += Number(r.gramosDisponibles) || 0;
                hallado = true;
            }
        });
    }
    if (esUnidad) {
        (inventario.componentes || []).forEach((c) => {
            if (coincide(c.tipo)) {
                disponible += Number(c.cantidadDisponible) || 0;
                hallado = true;
            }
        });
    }

    if (!hallado) return { estado: "faltante", disponible: 0 };
    if (mat.cantidad > 0 && disponible < mat.cantidad) return { estado: "insuficiente", disponible };
    return { estado: "ok", disponible };
}

const btnCancelarEdicionPatron = document.getElementById("btnCancelarEdicionPatron");
if (btnCancelarEdicionPatron) {
    btnCancelarEdicionPatron.addEventListener("click", () => limpiarFormPatron());
}

const patronBuscador = document.getElementById("patronBuscador");
if (patronBuscador) {
    patronBuscador.addEventListener("input", () => {
        estado.patronBusqueda = patronBuscador.value;
        renderPatrones();
    });
}

function limpiarFormPatron() {
    limpiarCampos([
        "patronNombre",
        "patronCategoria",
        "patronMateriales",
        "patronInstrucciones",
        "patronMatNombre",
        "patronMatCantidad",
        "patronMatUnidad",
    ]);
    estado.patronEditandoId = null;
    estado.materialesForm = [];
    renderMaterialesForm();

    const btn = document.getElementById("btnGuardarPatron");
    if (btn) btn.textContent = "Guardar Patrón";

    const cancelar = document.getElementById("btnCancelarEdicionPatron");
    if (cancelar) cancelar.style.display = "none";

    const titulo = document.getElementById("tituloFormPatron");
    if (titulo) titulo.textContent = "Nuevo Patrón";
}

function editarPatron(id) {
    const p = estado.patrones.find((x) => x.id === id);
    if (!p) return;

    estado.patronEditandoId = id;
    document.getElementById("patronNombre").value = p.nombre;
    document.getElementById("patronCategoria").value = p.categoria;
    document.getElementById("patronMateriales").value = p.materialesTexto || "";
    document.getElementById("patronInstrucciones").value = p.instrucciones;

    estado.materialesForm = (p.materiales || []).map((m) => ({ ...m }));
    renderMaterialesForm();

    const btn = document.getElementById("btnGuardarPatron");
    if (btn) btn.textContent = "Guardar cambios";

    const cancelar = document.getElementById("btnCancelarEdicionPatron");
    if (cancelar) cancelar.style.display = "inline-block";

    const titulo = document.getElementById("tituloFormPatron");
    if (titulo) titulo.textContent = `Editando: ${p.nombre} (${p.codigo})`;

    const nombre = document.getElementById("patronNombre");
    if (nombre) nombre.scrollIntoView({ behavior: "smooth", block: "start" });
}

function duplicarPatron(id) {
    const p = estado.patrones.find((x) => x.id === id);
    if (!p) return;

    const copia = agregarPatron(
        {
            nombre: `${p.nombre} (copia)`,
            categoria: p.categoria,
            materiales: (p.materiales || []).map((m) => ({ ...m })),
            materialesTexto: p.materialesTexto || "",
            instrucciones: p.instrucciones,
        },
        generarCodigoPatron(estado.patrones)
    );
    estado.patrones.push(copia);
    guardarPatrones(estado.patrones);
    renderPatrones();
}

async function crearProyectoDesdePatron(id) {
    const p = estado.patrones.find((x) => x.id === id);
    if (!p) return;

    const categoria = normalizar(p.categoria);
    const tipo = categoria.includes("prenda") ? "prenda" : categoria.includes("amigurumi") ? "amigurumi" : "otro";

    const lineasMateriales = (p.materiales || [])
        .map((m) => `- ${m.nombre}${m.cantidad ? ` (${m.cantidad}${m.unidad ? " " + m.unidad : ""})` : ""}`)
        .join("\n");

    const notas = [
        `Basado en el patrón ${p.codigo} - ${p.nombre}.`,
        lineasMateriales ? `\nMateriales:\n${lineasMateriales}` : "",
        p.materialesTexto ? `\n${p.materialesTexto}` : "",
    ]
        .join("")
        .trim();

    const nuevo = crearProyecto(p.nombre, tipo, notas);
    nuevo.patronOrigen = { id: p.id, codigo: p.codigo, nombre: p.nombre };
    estado.proyectos.unshift(nuevo);
    guardarProyectos(estado.proyectos);
    renderProyectos();

    const abrir = await confirmar(
        `Proyecto "${p.nombre}" creado desde el patrón ${p.codigo}.\n\n¿Abrirlo en el Planificador ahora?`,
        { titulo: "Proyecto creado", ok: "Abrir proyecto", cancelo: "Dejar aquí" }
    );
    if (abrir) {
        irASeccion("planificador");
        abrirEditorProyecto(nuevo.id);
    }
}

function toggleRevisarPatron(id) {
    estado.patronRevisadoId = estado.patronRevisadoId === id ? null : id;
    renderPatrones();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function renderCategoriasPatrones() {
    const cont = document.getElementById("patronCategorias");
    if (!cont) return;

    const conteo = {};
    estado.patrones.forEach((p) => {
        const cat = (p.categoria || "Sin categoría").trim() || "Sin categoría";
        conteo[cat] = (conteo[cat] || 0) + 1;
    });

    // Si la categoría filtrada ya no existe, volvemos a "Todas".
    if (estado.patronCategoriaFiltro && !Object.prototype.hasOwnProperty.call(conteo, estado.patronCategoriaFiltro)) {
        estado.patronCategoriaFiltro = "";
    }

    cont.innerHTML = "";

    const crearChip = (etiqueta, valor, activo) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip" + (activo ? " active" : "");
        chip.textContent = etiqueta;
        chip.dataset.categoria = valor;
        chip.addEventListener("click", () => {
            estado.patronCategoriaFiltro = valor;
            renderPatrones();
        });
        cont.appendChild(chip);
    };

    crearChip(`Todas (${estado.patrones.length})`, "", estado.patronCategoriaFiltro === "");
    Object.keys(conteo)
        .sort((a, b) => a.localeCompare(b))
        .forEach((cat) => crearChip(`${cat} (${conteo[cat]})`, cat, estado.patronCategoriaFiltro === cat));
}

function renderDetallePatron(p) {
    let html = `<div class="detalle-proyecto">`;
    html += `<div class="item-details">
        <span><strong>Código:</strong> ${escapeHtml(p.codigo)}</span>
        <span><strong>Categoría:</strong> ${escapeHtml(p.categoria || "-")}</span>
        <span><strong>Modificado:</strong> ${formatearFecha(p.fechaModificacion)}</span>
    </div>`;

    html += `<h4>Materiales necesarios</h4>`;
    const materiales = p.materiales || [];
    if (materiales.length) {
        html += `<ul class="lista-materiales-detalle">`;
        materiales.forEach((m) => {
            const disp = calcularDisponibilidadMaterial(m);
            const cant = `${m.cantidad ? `${m.cantidad}` : ""}${m.unidad ? ` ${m.unidad}` : ""}`.trim();
            let estado_;
            if (disp.estado === "ok") {
                estado_ = `<span class="badge-ok">✅ ${disp.disponible}${m.unidad ? " " + m.unidad : ""} en inventario</span>`;
            } else if (disp.estado === "insuficiente") {
                estado_ = `<span class="badge-pending">⚠️ Solo ${disp.disponible}${m.unidad ? " " + m.unidad : ""} en inventario</span>`;
            } else {
                estado_ = `<span class="badge-pending">❌ No está en inventario</span>`;
            }
            html += `<li><strong>${escapeHtml(m.nombre)}</strong>${cant ? ` — necesita ${escapeHtml(cant)}` : ""} ${estado_}</li>`;
        });
        html += `</ul>`;
    }
    if (p.materialesTexto) {
        html += `<div class="seccion-notas">${escapeHtml(p.materialesTexto)}</div>`;
    }
    if (!materiales.length && !p.materialesTexto) {
        html += `<p class="info-text">Sin materiales cargados.</p>`;
    }

    html += `<h4>Instrucciones</h4><div class="seccion-notas">${escapeHtml(p.instrucciones || "Sin instrucciones")}</div>`;
    html += `</div>`;
    return html;
}

function renderResumenMateriales(p) {
    const materiales = p.materiales || [];
    if (materiales.length) {
        const nombres = materiales
            .slice(0, 3)
            .map((m) => m.nombre)
            .join(", ");
        const extra = materiales.length > 3 ? `, +${materiales.length - 3} más` : "";
        return `${materiales.length} (${escapeHtml(nombres)}${extra})`;
    }
    if (p.materialesTexto) return escapeHtml(p.materialesTexto.slice(0, 60));
    return "-";
}

export function renderPatrones() {
    const lista = document.getElementById("listaPatrones");
    if (!lista) return;

    renderCategoriasPatrones();
    lista.innerHTML = "";

    const busqueda = normalizar(estado.patronBusqueda);
    const filtroCat = normalizar(estado.patronCategoriaFiltro);

    const filtrados = estado.patrones.filter((p) => {
        const cat = normalizar((p.categoria || "Sin categoría").trim() || "Sin categoría");
        const coincideCat = !filtroCat || cat === filtroCat;
        const coincideBusq =
            !busqueda || normalizar(p.nombre).includes(busqueda) || normalizar(p.codigo).includes(busqueda);
        return coincideCat && coincideBusq;
    });

    const resumen = document.getElementById("patronResumen");
    if (resumen) {
        resumen.textContent = estado.patrones.length
            ? `Mostrando ${filtrados.length} de ${estado.patrones.length} patrones.`
            : "Todavía no guardaste patrones.";
    }

    if (!filtrados.length) {
        lista.innerHTML = "<p class='empty-state'>No hay patrones que coincidan con la búsqueda.</p>";
        return;
    }

    filtrados.forEach((p) => {
        const abierto = estado.patronRevisadoId === p.id;
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-header">
                <span class="item-title">${escapeHtml(p.nombre)}</span>
                <span class="item-badges">
                    <span class="badge badge-codigo">${escapeHtml(p.codigo)}</span>
                    <span class="badge">${escapeHtml(p.categoria || "Sin categoría")}</span>
                </span>
            </div>
            <div class="item-details">
                <span><strong>Materiales:</strong> ${renderResumenMateriales(p)}</span>
            </div>
            <div class="item-actions">
                <button type="button" data-ver-patron="${p.id}">${abierto ? "Ocultar" : "Ver"}</button>
                <button type="button" class="btn-secundario" data-edit-patron="${p.id}">Editar</button>
                <button type="button" class="btn-info" data-dup-patron="${p.id}">Duplicar</button>
                <button type="button" class="btn-info" data-proy-patron="${p.id}">Crear proyecto</button>
                <button type="button" class="btn-secundario" data-exportar="${p.id}">Exportar</button>
                <button type="button" class="btn-danger" data-del-patron="${p.id}">Eliminar</button>
            </div>
            <div class="export-row" hidden>
                <span class="export-label">Exportar:</span>
                <button type="button" class="btn-secundario" data-export-pdf="${p.id}">PDF</button>
                <button type="button" class="btn-secundario" data-export-csv="${p.id}">CSV (Excel)</button>
                <button type="button" class="btn-secundario" data-export-png="${p.id}">PNG</button>
            </div>
            ${abierto ? renderDetallePatron(p) : ""}
        `;
        lista.appendChild(div);
    });

    lista.querySelectorAll("[data-ver-patron]").forEach((b) => {
        b.addEventListener("click", () => toggleRevisarPatron(b.dataset.verPatron));
    });
    lista.querySelectorAll("[data-edit-patron]").forEach((b) => {
        b.addEventListener("click", () => editarPatron(b.dataset.editPatron));
    });
    lista.querySelectorAll("[data-dup-patron]").forEach((b) => {
        b.addEventListener("click", () => duplicarPatron(b.dataset.dupPatron));
    });
    lista.querySelectorAll("[data-proy-patron]").forEach((b) => {
        b.addEventListener("click", () => crearProyectoDesdePatron(b.dataset.proyPatron));
    });
    lista.querySelectorAll("[data-exportar]").forEach((b) => {
        b.addEventListener("click", () => {
            const fila = b.closest(".item-card")?.querySelector(".export-row");
            if (fila) fila.hidden = !fila.hidden;
        });
    });
    lista.querySelectorAll("[data-export-pdf]").forEach((b) => {
        b.addEventListener("click", () => {
            const p = estado.patrones.find((x) => x.id === b.dataset.exportPdf);
            if (p) imprimirPatron(p);
        });
    });
    lista.querySelectorAll("[data-export-csv]").forEach((b) => {
        b.addEventListener("click", () => {
            const p = estado.patrones.find((x) => x.id === b.dataset.exportCsv);
            if (p) descargarPatronCSV(p);
        });
    });
    lista.querySelectorAll("[data-export-png]").forEach((b) => {
        b.addEventListener("click", () => {
            const p = estado.patrones.find((x) => x.id === b.dataset.exportPng);
            if (p) descargarPatronPNG(p);
        });
    });
    lista.querySelectorAll("[data-del-patron]").forEach((b) => {
        b.addEventListener("click", async () => {
            const p = estado.patrones.find((x) => x.id === b.dataset.delPatron);
            if (!p) return;
            const ok = await confirmar(`¿Eliminar el patrón "${p.nombre}" (${p.codigo})?\n\nNo se puede deshacer.`, {
                titulo: "Eliminar patrón",
                ok: "Eliminar",
            });
            if (!ok) return;

            eliminarPatron(estado.patrones, p.id);
            if (estado.patronRevisadoId === p.id) estado.patronRevisadoId = null;
            if (estado.patronEditandoId === p.id) limpiarFormPatron();
            guardarPatrones(estado.patrones);
            renderPatrones();
        });
    });
}
