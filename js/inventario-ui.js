import { estado } from "./estado.js";
import { escapeHtml, texto, num, valor, normalizar, limpiarCampos, descargarJson, casiIgual } from "./utils.js";
import { formatearMoneda } from "./ui.js";
import {
    guardarInventario,
    agregarLanaInventario,
    agregarRellenoInventario,
    agregarComponenteInventario,
    normalizarInventario,
} from "./inventario.js";

// ---------------------------------------------------------------------------
// Handlers (se enganchan al cargar el módulo)
// ---------------------------------------------------------------------------
const btnAgregarLanaInv = document.getElementById("btnAgregarLanaInv");
if (btnAgregarLanaInv) {
    btnAgregarLanaInv.addEventListener("click", () => {
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
            alert("Revisá los datos de la lana:\n\n• " + errores.join("\n• "));
            return;
        }

        const duplicada = estado.inventario.lanas.find(
            (x) =>
                normalizar(x.color) === normalizar(lana.color) &&
                normalizar(x.marca) === normalizar(lana.marca) &&
                casiIgual(x.precioOvillo, lana.precioOvillo) &&
                casiIgual(x.gramosOvillo, lana.gramosOvillo)
        );
        if (duplicada) {
            if (
                !confirm(
                    `Ya existe una lana "${lana.color}" (${lana.marca || "sin marca"}) con el mismo precio y gramaje.\n¿Sumar ${lana.gramosDisponibles} g a la existente?`
                )
            ) {
                return;
            }
            duplicada.gramosDisponibles = Number((duplicada.gramosDisponibles + lana.gramosDisponibles).toFixed(3));
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarCampos([
                "invColorLana",
                "invMarcaLana",
                "invPrecioOvillo",
                "invGramosOvillo",
                "invGramosDisponibles",
            ]);
            return;
        }

        estado.inventario = agregarLanaInventario(estado.inventario, lana);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarCampos(["invColorLana", "invMarcaLana", "invPrecioOvillo", "invGramosOvillo", "invGramosDisponibles"]);
    });
}

const btnAgregarRellenoInv = document.getElementById("btnAgregarRellenoInv");
if (btnAgregarRellenoInv) {
    btnAgregarRellenoInv.addEventListener("click", () => {
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
            alert("Revisá los datos del relleno:\n\n• " + errores.join("\n• "));
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
            if (
                !confirm(
                    `Ya existe un relleno "${relleno.tipo}" (${relleno.marca || "sin marca"}) igual.\n¿Sumar ${relleno.gramosDisponibles} g a la existente?`
                )
            ) {
                return;
            }
            duplicado.gramosDisponibles = Number((duplicado.gramosDisponibles + relleno.gramosDisponibles).toFixed(3));
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarCampos([
                "invTipoRelleno",
                "invMarcaRelleno",
                "invPrecioRelleno",
                "invGramosRellenoTot",
                "invGramosRellenoDisp",
            ]);
            return;
        }

        estado.inventario = agregarRellenoInventario(estado.inventario, relleno);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarCampos([
            "invTipoRelleno",
            "invMarcaRelleno",
            "invPrecioRelleno",
            "invGramosRellenoTot",
            "invGramosRellenoDisp",
        ]);
    });
}

const btnAgregarCompInv = document.getElementById("btnAgregarCompInv");
if (btnAgregarCompInv) {
    btnAgregarCompInv.addEventListener("click", () => {
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
            alert("Revisá los datos del componente:\n\n• " + errores.join("\n• "));
            return;
        }

        const duplicado = estado.inventario.componentes.find(
            (x) => normalizar(x.tipo) === normalizar(comp.tipo) && casiIgual(x.precioCompra, comp.precioCompra)
        );
        if (duplicado) {
            if (
                !confirm(
                    `Ya existe un componente "${comp.tipo}" con el mismo precio.\n¿Sumar ${comp.cantidadComprada} comprados y ${comp.cantidadDisponible} disponibles?`
                )
            ) {
                return;
            }
            duplicado.cantidadComprada += comp.cantidadComprada;
            duplicado.cantidadDisponible += comp.cantidadDisponible;
            guardarInventario(estado.inventario);
            renderInventario();
            limpiarCampos(["invTipoComp", "invCantCompradaComp", "invPrecioCompraComp", "invCantDispComp"]);
            return;
        }

        estado.inventario = agregarComponenteInventario(estado.inventario, comp);
        guardarInventario(estado.inventario);
        renderInventario();
        limpiarCampos(["invTipoComp", "invCantCompradaComp", "invPrecioCompraComp", "invCantDispComp"]);
    });
}

const btnVaciarInventario = document.getElementById("btnVaciarInventario");
if (btnVaciarInventario) {
    btnVaciarInventario.addEventListener("click", () => {
        if (confirm("¿Vaciar todo el inventario? Esta acción no se puede deshacer.")) {
            estado.inventario = { lanas: [], rellenos: [], componentes: [] };
            guardarInventario(estado.inventario);
            renderInventario();
        }
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
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                estado.inventario = normalizarInventario(data);
                guardarInventario(estado.inventario);
                renderInventario();
                alert("Inventario importado correctamente");
            } catch {
                alert("Archivo JSON inválido");
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
export function renderInventario() {
    const l = document.getElementById("listaLanasInv");
    const r = document.getElementById("listaRellenosInv");
    const c = document.getElementById("listaComponentesInv");

    if (l) {
        l.innerHTML = "";
        if (!estado.inventario.lanas.length) {
            l.innerHTML = "<p class='empty-state'>Sin lanas</p>";
        } else {
            estado.inventario.lanas.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.color || "Sin color")}</span><span class="item-badges"><span class="badge">${escapeHtml(x.marca || "")}</span></span></div><div class="item-details"><span>Disp: ${escapeHtml(x.gramosDisponibles)}g</span><span>Ovillo: ${escapeHtml(x.gramosOvillo)}g - ${formatearMoneda(x.precioOvillo)}</span></div>`;
                l.appendChild(div);
            });
        }
    }

    if (r) {
        r.innerHTML = "";
        if (!estado.inventario.rellenos.length) {
            r.innerHTML = "<p class='empty-state'>Sin relleno</p>";
        } else {
            estado.inventario.rellenos.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.tipo || "Sin tipo")}</span><span class="item-badges"><span class="badge">${escapeHtml(x.marca || "")}</span></span></div><div class="item-details"><span>Disp: ${escapeHtml(x.gramosDisponibles)}g</span><span>Total: ${escapeHtml(x.gramosRelleno)}g - ${formatearMoneda(x.precioRelleno)}</span></div>`;
                r.appendChild(div);
            });
        }
    }

    if (c) {
        c.innerHTML = "";
        if (!estado.inventario.componentes.length) {
            c.innerHTML = "<p class='empty-state'>Sin componentes</p>";
        } else {
            estado.inventario.componentes.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.tipo || "Sin tipo")}</span></div><div class="item-details"><span>Disp: ${escapeHtml(x.cantidadDisponible)} ud.</span><span>Comprados: ${escapeHtml(x.cantidadComprada)} ud. - ${formatearMoneda(x.precioCompra)}</span></div>`;
                c.appendChild(div);
            });
        }
    }
}
