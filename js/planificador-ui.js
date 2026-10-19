import { estado } from "./estado.js";
import { escapeHtml, texto, irASeccion, formatearFecha } from "./utils.js";
import { formatearMoneda } from "./ui.js";
import { crearProyecto, guardarProyectos, agregarSeccion, eliminarSeccion } from "./planificador.js";

// ---------------------------------------------------------------------------
// Proyecto seleccionado (destino del cálculo de la calculadora)
// ---------------------------------------------------------------------------
const bannerProyecto = document.getElementById("bannerProyecto");
const bannerProyectoNombre = document.getElementById("bannerProyectoNombre");

export function obtenerProyectoSeleccionado() {
    if (!estado.proyectoSeleccionadoId) return null;
    return estado.proyectos.find((p) => p.id === estado.proyectoSeleccionadoId) || null;
}

export function renderBannerProyecto() {
    const p = obtenerProyectoSeleccionado();
    const grupoNombre = document.getElementById("grupoNombreProyectoCalc");
    const btnGuardar = document.getElementById("btnGuardarDesdeCalculadora");
    const info = document.getElementById("infoProyectoSeleccionado");

    if (!p) {
        if (bannerProyecto) bannerProyecto.style.display = "none";
        if (grupoNombre) grupoNombre.style.display = "";
        if (btnGuardar) btnGuardar.textContent = "Guardar Proyecto";
        if (info) info.textContent = "Se creará un proyecto nuevo con el coste y los materiales usados.";
        return;
    }

    if (bannerProyecto) bannerProyecto.style.display = "flex";
    if (bannerProyectoNombre) bannerProyectoNombre.textContent = p.nombre;
    if (grupoNombre) grupoNombre.style.display = "none";
    if (btnGuardar) btnGuardar.textContent = `Guardar cálculo en "${p.nombre}"`;
    if (info) info.textContent = "El coste y los materiales se guardarán en el proyecto seleccionado.";
}

const btnQuitarProyectoSeleccionado = document.getElementById("btnQuitarProyectoSeleccionado");
if (btnQuitarProyectoSeleccionado) {
    btnQuitarProyectoSeleccionado.addEventListener("click", () => {
        estado.proyectoSeleccionadoId = null;
        renderBannerProyecto();
    });
}

// ---------------------------------------------------------------------------
// Handlers del planificador
// ---------------------------------------------------------------------------
const btnCrearProyecto = document.getElementById("btnCrearProyecto");
if (btnCrearProyecto) {
    btnCrearProyecto.addEventListener("click", () => {
        const nombre = texto("planNombreProyecto");
        if (!nombre) {
            alert("Escribe un nombre para el proyecto");
            return;
        }

        const nuevo = crearProyecto(
            nombre,
            document.getElementById("planTipoProyecto").value,
            texto("planNotasProyecto")
        );
        estado.proyectos.unshift(nuevo);
        guardarProyectos(estado.proyectos);

        estado.proyectoActivo = nuevo;
        renderProyectos();
        renderProyectoActivo();

        document.getElementById("planNombreProyecto").value = "";
        document.getElementById("planNotasProyecto").value = "";

        const editor = document.getElementById("editorProyecto");
        if (editor) editor.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

const btnAgregarSeccion = document.getElementById("btnAgregarSeccion");
if (btnAgregarSeccion) {
    btnAgregarSeccion.addEventListener("click", () => {
        if (!estado.proyectoActivo) {
            alert("Abrí o creá un proyecto primero");
            return;
        }

        const datos = {
            nombre: texto("planNombreSeccion"),
            puntos: document.getElementById("planPuntosSeccion").value,
            vueltas: document.getElementById("planVueltasSeccion").value,
            altura: document.getElementById("planAlturaSeccion").value,
            notas: texto("planNotasSeccion"),
        };
        if (!datos.nombre) {
            alert("Escribe un nombre para la sección");
            return;
        }

        agregarSeccion(estado.proyectoActivo, datos);
        guardarProyectos(estado.proyectos);
        renderProyectoActivo();
        renderProyectos();

        [
            "planNombreSeccion",
            "planPuntosSeccion",
            "planVueltasSeccion",
            "planAlturaSeccion",
            "planNotasSeccion",
        ].forEach((id) => {
            document.getElementById(id).value = "";
        });
    });
}

const btnCerrarProyectoActivo = document.getElementById("btnCerrarProyectoActivo");
if (btnCerrarProyectoActivo) {
    btnCerrarProyectoActivo.addEventListener("click", () => {
        estado.proyectoActivo = null;
        renderProyectoActivo();
    });
}

const btnGuardarDatosProyecto = document.getElementById("btnGuardarDatosProyecto");
if (btnGuardarDatosProyecto) {
    btnGuardarDatosProyecto.addEventListener("click", () => {
        if (!estado.proyectoActivo) return;

        const nombre = texto("editNombreProyecto");
        if (!nombre) {
            alert("El nombre del proyecto no puede estar vacío");
            return;
        }

        estado.proyectoActivo.nombre = nombre;
        estado.proyectoActivo.tipo = document.getElementById("editTipoProyecto").value;
        estado.proyectoActivo.notas = texto("editNotasProyecto");
        estado.proyectoActivo.fechaModificacion = new Date().toISOString();

        guardarProyectos(estado.proyectos);
        renderProyectoActivo();
        renderProyectos();
        renderBannerProyecto();

        const aviso = document.getElementById("avisoDatosProyecto");
        if (aviso) aviso.textContent = "Datos guardados ✔";
    });
}

const btnGuardarProyectoCompleto = document.getElementById("btnGuardarProyectoCompleto");
if (btnGuardarProyectoCompleto) {
    btnGuardarProyectoCompleto.addEventListener("click", () => {
        if (!estado.proyectoActivo) return;

        estado.proyectoActivo.fechaModificacion = new Date().toISOString();
        guardarProyectos(estado.proyectos);
        renderProyectos();

        if (confirm(`¿Querés calcular los costos de "${estado.proyectoActivo.nombre}" ahora?`)) {
            seleccionarParaCalcular(estado.proyectoActivo.id);
        } else {
            estado.proyectoActivo = null;
            renderProyectoActivo();
            alert("Proyecto guardado.");
        }
    });
}

// ---------------------------------------------------------------------------
// Acciones sobre proyectos
// ---------------------------------------------------------------------------
export function abrirEditorProyecto(id) {
    const p = estado.proyectos.find((x) => x.id === id);
    if (!p) return;
    estado.proyectoActivo = p;
    const aviso = document.getElementById("avisoDatosProyecto");
    if (aviso) aviso.textContent = "";
    renderProyectoActivo();
    const editor = document.getElementById("editorProyecto");
    if (editor) editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleRevisar(id) {
    estado.proyectoRevisadoId = estado.proyectoRevisadoId === id ? null : id;
    renderProyectos();
}

function seleccionarParaCalcular(id) {
    const p = estado.proyectos.find((x) => x.id === id);
    if (!p) return;
    estado.proyectoSeleccionadoId = id;
    renderBannerProyecto();
    irASeccion("calculadora");
    alert(`Proyecto seleccionado: ${p.nombre}\n\nCompletá la calculadora y el coste se guardará en este proyecto.`);
}

function eliminarProyecto(id) {
    const p = estado.proyectos.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar el proyecto "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

    estado.proyectos = estado.proyectos.filter((x) => x.id !== id);
    if (estado.proyectoActivo && estado.proyectoActivo.id === id) estado.proyectoActivo = null;
    if (estado.proyectoSeleccionadoId === id) estado.proyectoSeleccionadoId = null;
    if (estado.proyectoRevisadoId === id) estado.proyectoRevisadoId = null;

    guardarProyectos(estado.proyectos);
    renderProyectos();
    renderProyectoActivo();
    renderBannerProyecto();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
export function renderProyectoActivo() {
    const editor = document.getElementById("editorProyecto");
    if (!editor) return;

    if (!estado.proyectoActivo) {
        editor.style.display = "none";
        return;
    }

    editor.style.display = "block";
    document.getElementById("nombreProyectoActivo").textContent = estado.proyectoActivo.nombre;
    document.getElementById("tipoProyectoActivo").textContent = estado.proyectoActivo.tipo;

    // Datos editables del proyecto
    const editNombre = document.getElementById("editNombreProyecto");
    if (editNombre) editNombre.value = estado.proyectoActivo.nombre;
    const editTipo = document.getElementById("editTipoProyecto");
    if (editTipo) {
        editTipo.value = estado.proyectoActivo.tipo;
        if (editTipo.value !== estado.proyectoActivo.tipo) editTipo.value = "otro";
    }
    const editNotas = document.getElementById("editNotasProyecto");
    if (editNotas) editNotas.value = estado.proyectoActivo.notas || "";

    const lista = document.getElementById("listaSeccionesProyecto");
    if (!lista) return;
    lista.innerHTML = "";

    const secciones = Array.isArray(estado.proyectoActivo.secciones) ? estado.proyectoActivo.secciones : [];
    if (!secciones.length) {
        lista.innerHTML = "<p class='empty-state'>Sin secciones añadidas</p>";
        return;
    }

    secciones.forEach((s) => {
        const div = document.createElement("div");
        div.className = "seccion-card";
        div.innerHTML = `<div class="seccion-header"><span class="seccion-title">${escapeHtml(s.nombre)}</span><div class="item-actions"><button class="btn-danger" data-del-seccion="${s.id}">Eliminar</button></div></div><div class="seccion-details"><span><strong>Puntos:</strong> ${escapeHtml(s.puntos)}</span><span><strong>Vueltas/Filas:</strong> ${escapeHtml(s.vueltas)}</span><span><strong>Altura:</strong> ${escapeHtml(s.altura)}cm</span></div>${s.notas ? `<div class="seccion-notas">${escapeHtml(s.notas)}</div>` : ""}`;
        lista.appendChild(div);
    });

    lista.querySelectorAll("[data-del-seccion]").forEach((btn) => {
        btn.addEventListener("click", () => {
            eliminarSeccion(estado.proyectoActivo, btn.dataset.delSeccion);
            guardarProyectos(estado.proyectos);
            renderProyectoActivo();
            renderProyectos();
        });
    });
}

function renderDetalleProyecto(p) {
    const costo = p.costo || {};
    let html = `<div class="detalle-proyecto">`;

    html += `<h4>Coste</h4><div class="item-details">
        <span>Lanas: ${formatearMoneda(costo.lanas)}</span>
        <span>Relleno: ${formatearMoneda(costo.relleno)}</span>
        <span>Componentes: ${formatearMoneda(costo.componentes)}</span>
        <span>Mano de obra: ${formatearMoneda(costo.manoObra)}</span>
        <span><strong>Total: ${formatearMoneda(costo.total)}</strong></span>
    </div>`;

    if (costo.precioVenta > 0) {
        html += `<div class="item-details">
            <span>Precio de venta: ${formatearMoneda(costo.precioVenta)}</span>
            <span>Ganancia: ${formatearMoneda(costo.ganancia)}</span>
            <span>Margen: ${(Number(costo.margen) || 0).toFixed(1)} %</span>
        </div>`;
    }

    if (p.patronOrigen) {
        html += `<p class="info-text">📄 Patrón de origen: ${escapeHtml(p.patronOrigen.codigo)} — ${escapeHtml(p.patronOrigen.nombre)}</p>`;
    }

    const mat = p.materialesUsados || {};
    const lineas = [];
    if (mat.lana && (mat.lana.color || mat.lana.marca || mat.lana.gramosUsados)) {
        lineas.push(`Lana: ${mat.lana.color || "-"} ${mat.lana.marca || ""} (${mat.lana.gramosUsados || 0} g)`);
    }
    if (mat.relleno && (mat.relleno.tipo || mat.relleno.marca || mat.relleno.gramosUsados)) {
        lineas.push(
            `Relleno: ${mat.relleno.tipo || "-"} ${mat.relleno.marca || ""} (${mat.relleno.gramosUsados || 0} g)`
        );
    }
    (mat.componentes || []).forEach((c) => {
        lineas.push(`Componente: ${c.tipo || "-"} (${c.cantidadUtilizada || 0} ud.)`);
    });
    if (lineas.length) {
        html += `<h4>Materiales usados</h4><div class="seccion-notas">${escapeHtml(lineas.join("\n"))}</div>`;
    }

    const secciones = Array.isArray(p.secciones) ? p.secciones : [];
    if (secciones.length) {
        html += `<h4>Secciones</h4>`;
        secciones.forEach((s) => {
            html += `<div class="seccion-card"><div class="seccion-header"><span class="seccion-title">${escapeHtml(s.nombre)}</span></div><div class="seccion-details"><span><strong>Puntos:</strong> ${escapeHtml(s.puntos)}</span><span><strong>Vueltas:</strong> ${escapeHtml(s.vueltas)}</span><span><strong>Altura:</strong> ${escapeHtml(s.altura)} cm</span></div>${s.notas ? `<div class="seccion-notas">${escapeHtml(s.notas)}</div>` : ""}</div>`;
        });
    } else {
        html += `<h4>Secciones</h4><p class="info-text">Sin secciones.</p>`;
    }

    if (p.notas) {
        html += `<h4>Notas</h4><div class="seccion-notas">${escapeHtml(p.notas)}</div>`;
    }

    html += `</div>`;
    return html;
}

export function renderProyectos() {
    const lista = document.getElementById("listaProyectos");
    if (!lista) return;
    lista.innerHTML = "";

    if (!estado.proyectos.length) {
        lista.innerHTML = "<p class='empty-state'>Todavía no tenés proyectos. Creá uno arriba.</p>";
        return;
    }

    estado.proyectos.forEach((p) => {
        const terminado = p.estado === "terminado";
        const abierto = estado.proyectoRevisadoId === p.id;

        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-header">
                <span class="item-title">${escapeHtml(p.nombre)}</span>
                <span class="item-badges">
                    <span class="badge">${escapeHtml(p.tipo)}</span>
                    <span class="badge ${terminado ? "badge-ok" : "badge-pending"}">${terminado ? "Terminado" : "Planificando"}</span>
                </span>
            </div>
            <div class="item-details">
                <span>Coste total: ${formatearMoneda(p.costo.total)}</span>
                <span>Secciones: ${(p.secciones || []).length}</span>
                <span>Modificado: ${formatearFecha(p.fechaModificacion)}</span>
            </div>
            <div class="item-actions">
                <button type="button" data-revisar="${p.id}">${abierto ? "Ocultar" : "Revisar"}</button>
                <button type="button" class="btn-secundario" data-editar="${p.id}">Editar</button>
                <button type="button" class="btn-info" data-calcular="${p.id}">Calcular</button>
                <button type="button" class="btn-danger" data-eliminar="${p.id}">Eliminar</button>
            </div>
            ${abierto ? renderDetalleProyecto(p) : ""}
        `;
        lista.appendChild(div);
    });

    lista
        .querySelectorAll("[data-revisar]")
        .forEach((b) => b.addEventListener("click", () => toggleRevisar(b.dataset.revisar)));
    lista
        .querySelectorAll("[data-editar]")
        .forEach((b) => b.addEventListener("click", () => abrirEditorProyecto(b.dataset.editar)));
    lista
        .querySelectorAll("[data-calcular]")
        .forEach((b) => b.addEventListener("click", () => seleccionarParaCalcular(b.dataset.calcular)));
    lista
        .querySelectorAll("[data-eliminar]")
        .forEach((b) => b.addEventListener("click", () => eliminarProyecto(b.dataset.eliminar)));
}
