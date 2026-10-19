import { estado } from "./estado.js";
import { escapeHtml, texto } from "./utils.js";
import { confirmar, mostrarAviso } from "./modal.js";
import { mostrarComponente } from "./ui.js";
import {
    agregarCategoria,
    renombrarCategoria,
    eliminarCategoria,
    guardarCategorias,
    normalizarListaCategorias,
} from "./categorias.js";

// ---------------------------------------------------------------------------
// Administración de categorías de componentes.
// Se usan en el <select> de la calculadora y como sugerencias en inventario.
// ---------------------------------------------------------------------------
const inputCategoria = document.getElementById("nuevaCategoriaComp");
const btnAgregarCategoria = document.getElementById("btnAgregarCategoriaComp");
const btnCancelarEdicionCategoria = document.getElementById("btnCancelarEdicionCategoria");
const listaCategorias = document.getElementById("listaCategoriasComp");

let categoriaEditandoIdx = null;

/**
 * Rehace el <select> de la calculadora y las sugerencias del inventario con
 * las categorías actuales, conservando lo que el usuario tenía elegido.
 */
export function actualizarSelectsComponentes() {
    const select = document.getElementById("tipoComponente");
    if (select) {
        const valorActual = select.value;
        select.innerHTML = "";
        select.appendChild(new Option("Seleccionar...", ""));

        estado.categorias.forEach((categoria) => {
            select.appendChild(new Option(categoria, categoria));
        });

        select.value = estado.categorias.includes(valorActual) ? valorActual : "";
        mostrarComponente(document.getElementById("datosComponentes"), select);
    }

    const datalist = document.getElementById("categoriasComponentesOpciones");
    if (datalist) {
        datalist.innerHTML = "";
        estado.categorias.forEach((categoria) => {
            datalist.appendChild(new Option(categoria, categoria));
        });
    }
}

function actualizarBotonCategoria() {
    if (btnAgregarCategoria) {
        btnAgregarCategoria.textContent = categoriaEditandoIdx === null ? "Agregar categoría" : "Guardar cambios";
    }
    if (btnCancelarEdicionCategoria) {
        btnCancelarEdicionCategoria.style.display = categoriaEditandoIdx === null ? "none" : "";
    }
}

function iniciarEdicionCategoria(indice) {
    const nombre = estado.categorias[indice];
    if (nombre == null || !inputCategoria) return;

    categoriaEditandoIdx = indice;
    inputCategoria.value = nombre;
    actualizarBotonCategoria();

    inputCategoria.scrollIntoView({ behavior: "smooth", block: "center" });
    inputCategoria.focus();
    inputCategoria.select();
}

function cancelarEdicionCategoria() {
    categoriaEditandoIdx = null;
    if (inputCategoria) inputCategoria.value = "";
    actualizarBotonCategoria();
}

function guardarListaCategorias(lista) {
    estado.categorias = normalizarListaCategorias(lista);
    guardarCategorias(estado.categorias);
    renderCategorias();
}

async function eliminarCategoriaDeLista(indice) {
    const nombre = estado.categorias[indice];
    if (nombre == null) return;

    const ok = await confirmar(
        `¿Eliminar la categoría "${nombre}"?\n\nLos materiales que ya la usan conservan su tipo, pero deja de aparecer en la calculadora.`,
        { titulo: "Eliminar categoría", ok: "Eliminar" }
    );
    if (!ok) return;

    if (categoriaEditandoIdx === indice) cancelarEdicionCategoria();
    else if (categoriaEditandoIdx !== null && categoriaEditandoIdx > indice) categoriaEditandoIdx -= 1;

    guardarListaCategorias(eliminarCategoria(estado.categorias, indice));
}

export function renderCategorias() {
    actualizarSelectsComponentes();

    if (!listaCategorias) return;

    listaCategorias.innerHTML = "";
    if (!estado.categorias.length) {
        listaCategorias.innerHTML =
            "<p class='empty-state'>No hay categorías. Agregá al menos una para usar componentes.</p>";
        return;
    }

    estado.categorias.forEach((nombre, indice) => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-header">
                <span class="item-title">${escapeHtml(nombre)}</span>
            </div>
            <div class="item-actions">
                <button type="button" class="btn-secundario" data-cat-accion="editar" data-cat-idx="${indice}">Editar</button>
                <button type="button" class="btn-danger" data-cat-accion="eliminar" data-cat-idx="${indice}">Eliminar</button>
            </div>`;

        listaCategorias.appendChild(div);
    });

    listaCategorias.querySelectorAll("[data-cat-accion]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const indice = Number(btn.dataset.catIdx);
            if (btn.dataset.catAccion === "editar") iniciarEdicionCategoria(indice);
            else await eliminarCategoriaDeLista(indice);
        });
    });
}

if (btnAgregarCategoria) {
    btnAgregarCategoria.addEventListener("click", async () => {
        const nombre = texto("nuevaCategoriaComp");
        const resultado =
            categoriaEditandoIdx === null
                ? agregarCategoria(estado.categorias, nombre)
                : renombrarCategoria(estado.categorias, categoriaEditandoIdx, nombre);

        if (!resultado.ok) {
            await mostrarAviso(resultado.error, { titulo: "Categoría no válida" });
            if (inputCategoria) inputCategoria.focus();
            return;
        }

        categoriaEditandoIdx = null;
        cancelarEdicionCategoria();
        guardarListaCategorias(resultado.lista);
    });
}

if (btnCancelarEdicionCategoria) {
    btnCancelarEdicionCategoria.addEventListener("click", cancelarEdicionCategoria);
}

if (inputCategoria) {
    inputCategoria.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            btnAgregarCategoria?.click();
        }
    });
}

actualizarBotonCategoria();
