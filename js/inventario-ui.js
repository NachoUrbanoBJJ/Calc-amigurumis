import { estado } from "./estado.js";
import { escapeHtml, texto, num, valor, normalizar, limpiarCampos, descargarJson, casiIgual } from "./utils.js";
import { formatearMoneda } from "./ui.js";
import {
    guardarInventario,
    agregarLanaInventario,
    agregarRellenoInventario,
    agregarComponenteInventario,
    normalizarInventario,
    clasificarStock,
} from "./inventario.js";
import { confirmar, mostrarAviso } from "./modal.js";

// ---------------------------------------------------------------------------
// Formularios de alta/edición de inventario
// ---------------------------------------------------------------------------
const COLECCIONES = { lana: "lanas", relleno: "rellenos", componente: "componentes" };

// `campos` mapea el id del input con la clave del material guardado.
const FORMULARIOS = {
    lana: {
        campos: {
            invColorLana: "color",
            invMarcaLana: "marca",
            invPrecioOvillo: "precioOvillo",
            invGramosOvillo: "gramosOvillo",
            invGramosDisponibles: "gramosDisponibles",
        },
        btnAlta: "btnAgregarLanaInv",
        btnCancelar: "btnCancelarEdicionLana",
        foco: "invColorLana",
    },
    relleno: {
        campos: {
            invTipoRelleno: "tipo",
            invMarcaRelleno: "marca",
            invPrecioRelleno: "precioRelleno",
            invGramosRellenoTot: "gramosRelleno",
            invGramosRellenoDisp: "gramosDisponibles",
        },
        btnAlta: "btnAgregarRellenoInv",
        btnCancelar: "btnCancelarEdicionRelleno",
        foco: "invTipoRelleno",
    },
    componente: {
        campos: {
            invTipoComp: "tipo",
            invCantCompradaComp: "cantidadComprada",
            invPrecioCompraComp: "precioCompra",
            invCantDispComp: "cantidadDisponible",
        },
        btnAlta: "btnAgregarCompInv",
        btnCancelar: "btnCancelarEdicionComponente",
        foco: "invTipoComp",
    },
};

// Id del material que se está editando en cada formulario (null = alta).
const editando = { lana: null, relleno: null, componente: null };

function rellenarFormulario(tipo, item) {
    Object.entries(FORMULARIOS[tipo].campos).forEach(([idCampo, clave]) => {
        const el = document.getElementById(idCampo);
        if (el) el.value = item[clave] == null ? "" : item[clave];
    });
}

function refrescarFormulario(tipo) {
    const cfg = FORMULARIOS[tipo];
    const enEdicion = editando[tipo] !== null;

    const btnAlta = document.getElementById(cfg.btnAlta);
    if (btnAlta) btnAlta.textContent = enEdicion ? "Guardar cambios" : "Añadir a Inventario";

    const btnCancelar = document.getElementById(cfg.btnCancelar);
    if (btnCancelar) btnCancelar.style.display = enEdicion ? "" : "none";
}

function limpiarFormulario(tipo) {
    limpiarCampos(Object.keys(FORMULARIOS[tipo].campos));
}

function iniciarEdicion(tipo, id) {
    const item = estado.inventario[COLECCIONES[tipo]].find((x) => x.id === id);
    if (!item) return;

    editando[tipo] = id;
    rellenarFormulario(tipo, item);
    refrescarFormulario(tipo);

    const foco = document.getElementById(FORMULARIOS[tipo].foco);
    if (foco) {
        foco.scrollIntoView({ behavior: "smooth", block: "center" });
        foco.focus();
    }
}

function cancelarEdicion(tipo, { limpiar = true } = {}) {
    editando[tipo] = null;
    if (limpiar) limpiarFormulario(tipo);
    refrescarFormulario(tipo);
}

["lana", "relleno", "componente"].forEach((tipo) => {
    const btn = document.getElementById(FORMULARIOS[tipo].btnCancelar);
    if (btn) btn.addEventListener("click", () => cancelarEdicion(tipo));
});

// ---------------------------------------------------------------------------
// Alta / edición
// ---------------------------------------------------------------------------
const btnAgregarLanaInv = document.getElementById("btnAgregarLanaInv");
if (btnAgregarLanaInv) {
    btnAgregarLanaInv.addEventListener("click", async () => {
        const lana = {
            color: texto("invColorLana"),
            marca: texto("invMarcaLana"),
            precioOvillo: num("invPrecioOvillo"),
            gramosOvillo: num("invGramosOvillo"),
            gramosDisponibles: num("invGramosDisponibles"),
        };

        const errores = [];
        if (!lana.color) errores.push("El color es obligatorio.");
        if (valor("invPrecioOvillo") === "" || !Number.isFinite(lana.precioOvillo) || lana.precioOvillo <= 0) {
            errores.push("El precio del ovillo debe ser mayor a 0.");
        }
        if (valor("invGramosOvillo") === "" || !Number.isFinite(lana.gramosOvillo) || lana.gramosOvillo <= 0) {
            errores.push("Los gramos por ovillo deben ser mayores a 0.");
        }
        if (
            valor("invGramosDisponibles") === "" ||
            !Number.isFinite(lana.gramosDisponibles) ||
            lana.gramosDisponibles < 0
        ) {
            errores.push("Los gramos disponibles no pueden ser negativos.");
        }
        if (errores.length) {
            await mostrarAviso("Revisá los datos de la lana:\n\n• " + errores.join("\n• "), {
                titulo: "Datos incompletos",
            });
            return;
        }

        // Modo edición: actualizamos el lana seleccionado.
        if (editando.lana !== null) {
            const existente = estado.inventario.lanas.find((x) => x.id === editando.lana);
            if (existente) Object.assign(existente, lana);
            guardarInventario(estado.inventario);
            cancelarEdicion("lana");
            renderInventario();
            return;
        }

        // Modo alta: si ya existe una igual, sumamos el stock.
        const duplicada = estado.inventario.lanas.find(
            (x) =>
                normalizar(x.color) === normalizar(lana.color) &&
                normalizar(x.marca) === normalizar(lana.marca) &&
                casiIgual(x.precioOvillo, lana.precioOvillo) &&
                casiIgual(x.gramosOvillo, lana.gramosOvillo)
        );
        if (duplicada) {
            const ok = await confirmar(
                `Ya existe una lana "${lana.color}" (${lana.marca || "sin marca"}) con el mismo precio y gramaje.\n\n¿Sumar ${lana.gramosDisponibles} g a la existente?`,
                { titulo: "Lana duplicada", ok: "Sumar stock" }
            );
            if (!ok) return;

            duplicada.gramosDisponibles = Number((duplicada.gramosDisponibles + lana.gramosDisponibles).toFixed(3));
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarFormulario("lana");
            return;
        }

        estado.inventario = agregarLanaInventario(estado.inventario, lana);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarFormulario("lana");
    });
}

const btnAgregarRellenoInv = document.getElementById("btnAgregarRellenoInv");
if (btnAgregarRellenoInv) {
    btnAgregarRellenoInv.addEventListener("click", async () => {
        const relleno = {
            tipo: texto("invTipoRelleno"),
            marca: texto("invMarcaRelleno"),
            precioRelleno: num("invPrecioRelleno"),
            gramosRelleno: num("invGramosRellenoTot"),
            gramosDisponibles: num("invGramosRellenoDisp"),
        };

        const errores = [];
        if (!relleno.tipo) errores.push("El tipo de relleno es obligatorio.");
        if (valor("invPrecioRelleno") === "" || !Number.isFinite(relleno.precioRelleno) || relleno.precioRelleno <= 0) {
            errores.push("El precio del relleno debe ser mayor a 0.");
        }
        if (
            valor("invGramosRellenoTot") === "" ||
            !Number.isFinite(relleno.gramosRelleno) ||
            relleno.gramosRelleno <= 0
        ) {
            errores.push("Los gramos totales deben ser mayores a 0.");
        }
        if (
            valor("invGramosRellenoDisp") === "" ||
            !Number.isFinite(relleno.gramosDisponibles) ||
            relleno.gramosDisponibles < 0
        ) {
            errores.push("Los gramos disponibles no pueden ser negativos.");
        }
        if (errores.length) {
            await mostrarAviso("Revisá los datos del relleno:\n\n• " + errores.join("\n• "), {
                titulo: "Datos incompletos",
            });
            return;
        }

        if (editando.relleno !== null) {
            const existente = estado.inventario.rellenos.find((x) => x.id === editando.relleno);
            if (existente) Object.assign(existente, relleno);
            guardarInventario(estado.inventario);
            cancelarEdicion("relleno");
            renderInventario();
            return;
        }

        const duplicado = estado.inventario.rellenos.find(
            (x) =>
                normalizar(x.tipo) === normalizar(relleno.tipo) &&
                normalizar(x.marca) === normalizar(relleno.marca) &&
                casiIgual(x.precioRelleno, relleno.precioRelleno) &&
                casiIgual(x.gramosRelleno, relleno.gramosRelleno)
        );
        if (duplicado) {
            const ok = await confirmar(
                `Ya existe un relleno "${relleno.tipo}" (${relleno.marca || "sin marca"}) igual.\n\n¿Sumar ${relleno.gramosDisponibles} g a la existente?`,
                { titulo: "Relleno duplicado", ok: "Sumar stock" }
            );
            if (!ok) return;

            duplicado.gramosDisponibles = Number((duplicado.gramosDisponibles + relleno.gramosDisponibles).toFixed(3));
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarFormulario("relleno");
            return;
        }

        estado.inventario = agregarRellenoInventario(estado.inventario, relleno);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarFormulario("relleno");
    });
}

const btnAgregarCompInv = document.getElementById("btnAgregarCompInv");
if (btnAgregarCompInv) {
    btnAgregarCompInv.addEventListener("click", async () => {
        const comp = {
            tipo: texto("invTipoComp"),
            cantidadComprada: num("invCantCompradaComp"),
            precioCompra: num("invPrecioCompraComp"),
            cantidadDisponible: num("invCantDispComp"),
        };

        const errores = [];
        if (!comp.tipo) errores.push("El tipo de componente es obligatorio.");
        if (
            valor("invCantCompradaComp") === "" ||
            !Number.isInteger(comp.cantidadComprada) ||
            comp.cantidadComprada <= 0
        ) {
            errores.push("La cantidad comprada debe ser un número entero mayor a 0.");
        }
        if (valor("invPrecioCompraComp") === "" || !Number.isFinite(comp.precioCompra) || comp.precioCompra <= 0) {
            errores.push("El precio de compra debe ser mayor a 0.");
        }
        if (
            valor("invCantDispComp") === "" ||
            !Number.isInteger(comp.cantidadDisponible) ||
            comp.cantidadDisponible < 0
        ) {
            errores.push("La cantidad disponible debe ser un número entero (0 o más).");
        } else if (comp.cantidadDisponible > comp.cantidadComprada) {
            errores.push("La cantidad disponible no puede ser mayor a la comprada.");
        }
        if (errores.length) {
            await mostrarAviso("Revisá los datos del componente:\n\n• " + errores.join("\n• "), {
                titulo: "Datos incompletos",
            });
            return;
        }

        if (editando.componente !== null) {
            const existente = estado.inventario.componentes.find((x) => x.id === editando.componente);
            if (existente) Object.assign(existente, comp);
            guardarInventario(estado.inventario);
            cancelarEdicion("componente");
            renderInventario();
            return;
        }

        const duplicado = estado.inventario.componentes.find(
            (x) => normalizar(x.tipo) === normalizar(comp.tipo) && casiIgual(x.precioCompra, comp.precioCompra)
        );
        if (duplicado) {
            const ok = await confirmar(
                `Ya existe un componente "${comp.tipo}" con el mismo precio.\n\n¿Sumar ${comp.cantidadComprada} comprados y ${comp.cantidadDisponible} disponibles?`,
                { titulo: "Componente duplicado", ok: "Sumar stock" }
            );
            if (!ok) return;

            duplicado.cantidadComprada += comp.cantidadComprada;
            duplicado.cantidadDisponible += comp.cantidadDisponible;
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarFormulario("componente");
            return;
        }

        estado.inventario = agregarComponenteInventario(estado.inventario, comp);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarFormulario("componente");
    });
}

// ---------------------------------------------------------------------------
// Vaciar / exportar / importar
// ---------------------------------------------------------------------------
const btnVaciarInventario = document.getElementById("btnVaciarInventario");
if (btnVaciarInventario) {
    btnVaciarInventario.addEventListener("click", async () => {
        const hayAlgo =
            estado.inventario.lanas.length + estado.inventario.rellenos.length + estado.inventario.componentes.length >
            0;
        if (!hayAlgo) {
            await mostrarAviso("El inventario ya está vacío.", { titulo: "Nada que vaciar" });
            return;
        }

        const ok = await confirmar("¿Vaciar todo el inventario?\n\nEsta acción no se puede deshacer.", {
            titulo: "Vaciar inventario",
            ok: "Vaciar todo",
        });
        if (!ok) return;

        estado.inventario = { lanas: [], rellenos: [], componentes: [] };
        guardarInventario(estado.inventario);
        cancelarEdicion("lana", { limpiar: false });
        cancelarEdicion("relleno", { limpiar: false });
        cancelarEdicion("componente", { limpiar: false });
        renderInventario();
    });
}

const btnExportarInventario = document.getElementById("btnExportarInventario");
if (btnExportarInventario) {
    btnExportarInventario.addEventListener("click", () => {
        descargarJson(`inventario-amigurumis-${Date.now()}.json`, estado.inventario);
    });
}

const inputImportarInventario = document.getElementById("inputImportarInventario");
if (inputImportarInventario) {
    inputImportarInventario.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                const ok = await confirmar(
                    "Esto reemplazará todo el inventario actual por el del archivo. ¿Continuar?",
                    { titulo: "Importar inventario", ok: "Sí, reemplazar" }
                );
                if (ok) {
                    estado.inventario = normalizarInventario(data);
                    guardarInventario(estado.inventario);
                    cancelarEdicion("lana", { limpiar: false });
                    cancelarEdicion("relleno", { limpiar: false });
                    cancelarEdicion("componente", { limpiar: false });
                    renderInventario();
                    await mostrarAviso(
                        `Inventario importado: ${estado.inventario.lanas.length} lanas, ${estado.inventario.rellenos.length} rellenos, ${estado.inventario.componentes.length} componentes.`,
                        { titulo: "Importación terminada" }
                    );
                }
            } catch {
                await mostrarAviso("No se pudo importar el archivo. Tiene que ser un JSON de inventario válido.", {
                    titulo: "Archivo inválido",
                });
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}

// ---------------------------------------------------------------------------
// Stock (avisos de "sin stock" / "stock bajo")
// ---------------------------------------------------------------------------
function stockDe(tipo, item) {
    if (tipo === "lana") return clasificarStock(item.gramosDisponibles, item.gramosOvillo);
    if (tipo === "relleno") return clasificarStock(item.gramosDisponibles, item.gramosRelleno);
    return clasificarStock(item.cantidadDisponible, item.cantidadComprada);
}

function etiquetaItem(tipo, item) {
    if (tipo === "lana") return `${item.color || "Sin color"} (${item.marca || "sin marca"})`;
    if (tipo === "relleno") return `${item.tipo || "Sin tipo"} (${item.marca || "sin marca"})`;
    return item.tipo || "Sin tipo";
}

function renderResumen() {
    const cont = document.getElementById("inventarioResumen");
    if (!cont) return;

    const total = Object.values(COLECCIONES).reduce((suma, coleccion) => suma + estado.inventario[coleccion].length, 0);

    const sinStock = [];
    const bajo = [];
    Object.entries(COLECCIONES).forEach(([tipo, coleccion]) => {
        estado.inventario[coleccion].forEach((item) => {
            const stock = stockDe(tipo, item);
            if (!stock) return;
            (stock.clase === "badge-agotado" ? sinStock : bajo).push(etiquetaItem(tipo, item));
        });
    });

    if (!sinStock.length && !bajo.length) {
        cont.className = "info-text resumen-stock resumen-ok";
        cont.textContent = total ? "✔️ Inventario completo: todos los materiales tienen stock." : "";
        return;
    }

    const partes = [];
    if (sinStock.length) partes.push(`${sinStock.length} sin stock (${sinStock.join(", ")})`);
    if (bajo.length) partes.push(`${bajo.length} con poco stock (${bajo.join(", ")})`);
    cont.className = "info-text resumen-stock resumen-alerta";
    cont.textContent = "⚠️ " + partes.join(" · ");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function crearCard(tipo, item, { titulo, marca, detalles }) {
    const stock = stockDe(tipo, item);
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
        <div class="item-header">
            <span class="item-title">${escapeHtml(titulo)}</span>
            <span class="item-badges">
                ${marca ? `<span class="badge">${escapeHtml(marca)}</span>` : ""}
                ${stock ? `<span class="badge ${stock.clase}">${stock.texto}</span>` : ""}
            </span>
        </div>
        <div class="item-details">${detalles.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="item-actions">
            <button type="button" class="btn-secundario" data-inv-tipo="${tipo}" data-inv-accion="editar" data-inv-id="${escapeHtml(item.id || "")}">Editar</button>
            <button type="button" class="btn-danger" data-inv-tipo="${tipo}" data-inv-accion="eliminar" data-inv-id="${escapeHtml(item.id || "")}">Eliminar</button>
        </div>`;
    return div;
}

function conectarAcciones(cont) {
    cont.querySelectorAll("[data-inv-accion]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const tipo = btn.dataset.invTipo;
            const id = btn.dataset.invId;
            if (btn.dataset.invAccion === "editar") iniciarEdicion(tipo, id);
            else await eliminarItem(tipo, id);
        });
    });
}

async function eliminarItem(tipo, id) {
    const coleccion = COLECCIONES[tipo];
    const item = estado.inventario[coleccion].find((x) => x.id === id);
    if (!item) return;

    const ok = await confirmar(
        `¿Eliminar "${etiquetaItem(tipo, item)}" del inventario?\n\nEsta acción no se puede deshacer.`,
        { titulo: "Eliminar del inventario", ok: "Eliminar" }
    );
    if (!ok) return;

    estado.inventario[coleccion] = estado.inventario[coleccion].filter((x) => x.id !== id);
    if (editando[tipo] === id) cancelarEdicion(tipo, { limpiar: false });
    guardarInventario(estado.inventario);
    renderInventario();
}

function pintarLista(idLista, coleccion, vacio, renderCard) {
    const cont = document.getElementById(idLista);
    if (!cont) return;

    cont.innerHTML = "";
    if (!estado.inventario[coleccion].length) {
        cont.innerHTML = `<p class='empty-state'>${vacio}</p>`;
        return;
    }

    estado.inventario[coleccion].forEach((item) => cont.appendChild(renderCard(item)));
    conectarAcciones(cont);
}

export function renderInventario() {
    pintarLista("listaLanasInv", "lanas", "Sin lanas cargadas", (x) =>
        crearCard("lana", x, {
            titulo: x.color || "Sin color",
            marca: x.marca,
            detalles: [
                `Disp: ${escapeHtml(x.gramosDisponibles)} g`,
                `Ovillo: ${escapeHtml(x.gramosOvillo)} g - ${formatearMoneda(x.precioOvillo)}`,
            ],
        })
    );

    pintarLista("listaRellenosInv", "rellenos", "Sin relleno cargado", (x) =>
        crearCard("relleno", x, {
            titulo: x.tipo || "Sin tipo",
            marca: x.marca,
            detalles: [
                `Disp: ${escapeHtml(x.gramosDisponibles)} g`,
                `Total: ${escapeHtml(x.gramosRelleno)} g - ${formatearMoneda(x.precioRelleno)}`,
            ],
        })
    );

    pintarLista("listaComponentesInv", "componentes", "Sin componentes cargados", (x) =>
        crearCard("componente", x, {
            titulo: x.tipo || "Sin tipo",
            detalles: [
                `Disp: ${escapeHtml(x.cantidadDisponible)} ud.`,
                `Comprados: ${escapeHtml(x.cantidadComprada)} ud. - ${formatearMoneda(x.precioCompra)}`,
            ],
        })
    );

    renderResumen();
}
