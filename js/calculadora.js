import { estado, cargarConfig, guardarConfig, aplicarValorHoraPorDefecto } from "./estado.js";
import { escapeHtml, texto, num, valor, mostrarAvisoGlobal, esObjeto } from "./utils.js";
import { confirmar, mostrarAviso } from "./modal.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";
import {
    calcularLana,
    calcularRelleno,
    calcularManoObra,
    calcularTotalComponentes,
    calcularPrecioIdeal,
    calcularVenta,
} from "./calculos.js";
import { descontarLanaPorId, descontarRellenoPorId, descontarComponentes, guardarInventario } from "./inventario.js";
import { renderInventario } from "./inventario-ui.js";
import { renderProyectos, renderBannerProyecto, obtenerProyectoSeleccionado } from "./planificador-ui.js";
import { crearProyecto, guardarProyectos } from "./planificador.js";
import {
    actualizarInfoSelectores,
    categoriaSugeridaComponente,
    etiquetaComponente,
    etiquetaLana,
    etiquetaRelleno,
    obtenerComponentePorId,
    obtenerLanaPorId,
    obtenerRellenoPorId,
    renderSelectoresInventario,
} from "./selectores-inventario.js";
import { formatearCantidadUnidad } from "./unidades.js";

// ---------------------------------------------------------------------------
// Referencias del DOM
// ---------------------------------------------------------------------------
const tipoComponente = document.getElementById("tipoComponente");
const datosComponentes = document.getElementById("datosComponentes");
const btnAgregarComponente = document.getElementById("btnAgregarComponente");
const listaComponentes = document.getElementById("listaComponentes");
const btnCalcular = document.getElementById("btnCalcular");
const btnLimpiar = document.getElementById("btnLimpiar");
const resultados = document.getElementById("resultados");

if (tipoComponente) {
    tipoComponente.addEventListener("change", () => mostrarComponente(datosComponentes, tipoComponente));
    mostrarComponente(datosComponentes, tipoComponente);
}
if (btnAgregarComponente) btnAgregarComponente.addEventListener("click", agregarComponente);
if (btnCalcular) btnCalcular.addEventListener("click", calcularTodo);
if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarTodo);

const btnCancelarEdicionComponenteCalc = document.getElementById("btnCancelarEdicionComponenteCalc");
if (btnCancelarEdicionComponenteCalc) {
    btnCancelarEdicionComponenteCalc.addEventListener("click", () => cancelarEdicionComponente());
}

const lanaInventario = document.getElementById("lanaInventarioId");
if (lanaInventario) lanaInventario.addEventListener("change", aplicarInventarioLana);

const rellenoInventario = document.getElementById("rellenoInventarioId");
if (rellenoInventario) rellenoInventario.addEventListener("change", aplicarInventarioRelleno);

const componenteInventario = document.getElementById("componenteInventarioId");
if (componenteInventario) componenteInventario.addEventListener("change", aplicarInventarioComponente);

// ---------------------------------------------------------------------------
// Materiales del inventario vinculados al cálculo
// ---------------------------------------------------------------------------
function asignarCampo(id, valorCampo) {
    const el = document.getElementById(id);
    if (el) el.value = valorCampo == null ? "" : valorCampo;
}

function aplicarInventarioLana() {
    const lana = obtenerLanaPorId(lanaInventario?.value || "");
    if (lana) {
        asignarCampo("colorLana", lana.color || "");
        asignarCampo("marcaLana", lana.marca || "");
        asignarCampo("precioOvillo", lana.precioOvillo || "");
        asignarCampo("gramosOvillo", lana.gramosOvillo || "");
    }
    actualizarInfoSelectores();
}

function aplicarInventarioRelleno() {
    const relleno = obtenerRellenoPorId(rellenoInventario?.value || "");
    if (relleno) {
        asignarCampo("tipoRelleno", relleno.tipo || "");
        asignarCampo("marcaRelleno", relleno.marca || "");
        asignarCampo("precioRelleno", relleno.precioRelleno || "");
        asignarCampo("gramosRelleno", relleno.gramosRelleno || "");
    }
    actualizarInfoSelectores();
}

function aplicarInventarioComponente() {
    const comp = obtenerComponentePorId(componenteInventario?.value || "");
    if (!comp) {
        actualizarInfoSelectores();
        return;
    }

    if (tipoComponente) {
        const categoria = categoriaSugeridaComponente(comp);
        if (categoria) {
            tipoComponente.value = categoria;
        } else {
            const existe = Array.from(tipoComponente.options).some((opcion) => opcion.value === comp.tipo);
            if (!existe) {
                const opcion = document.createElement("option");
                opcion.value = comp.tipo;
                opcion.textContent = comp.tipo;
                tipoComponente.appendChild(opcion);
            }
            tipoComponente.value = comp.tipo;
        }
        mostrarComponente(datosComponentes, tipoComponente);
    }

    asignarCampo("cantidadComprada", comp.cantidadComprada);
    asignarCampo("precioCompra", comp.precioCompra);
    actualizarInfoSelectores();
}

// ---------------------------------------------------------------------------
// Componentes (alta, edición y baja)
// ---------------------------------------------------------------------------
// Índice del componente que se está editando (null = modo alta).
let editandoComponenteIdx = null;

function pintarComponentes() {
    mostrarListaComponentes(estado.componentes, listaComponentes);
    if (listaComponentes) {
        listaComponentes.querySelectorAll("[data-comp-idx]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = Number(btn.dataset.compIdx);
                if (btn.dataset.compAccion === "eliminar") eliminarComponente(idx);
                else editarComponente(idx);
            });
        });
    }
    actualizarBotonComponente();
}

function actualizarBotonComponente() {
    if (btnAgregarComponente) {
        btnAgregarComponente.textContent =
            editandoComponenteIdx !== null ? "Guardar cambios del componente" : "Agregar Componente";
    }
    if (btnCancelarEdicionComponenteCalc) {
        btnCancelarEdicionComponenteCalc.style.display = editandoComponenteIdx !== null ? "" : "none";
    }
}

function cancelarEdicionComponente() {
    editandoComponenteIdx = null;
    ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    if (componenteInventario) componenteInventario.value = "";
    actualizarInfoSelectores();
    actualizarBotonComponente();
}

function editarComponente(idx) {
    const comp = estado.componentes[idx];
    if (!comp) return;

    editandoComponenteIdx = idx;
    if (tipoComponente) {
        tipoComponente.value = comp.tipo;
        mostrarComponente(datosComponentes, tipoComponente);
    }
    if (componenteInventario) {
        componenteInventario.value = obtenerComponentePorId(comp.inventarioId) ? comp.inventarioId : "";
    }
    ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = comp[id];
    });
    actualizarInfoSelectores();
    actualizarBotonComponente();

    const primero = document.getElementById("cantidadComprada");
    if (primero) {
        primero.scrollIntoView({ behavior: "smooth", block: "center" });
        primero.focus();
    }
}

async function eliminarComponente(idx) {
    const comp = estado.componentes[idx];
    if (!comp) return;

    const ok = await confirmar(`¿Quitar "${comp.tipo}" de la lista de componentes?`, { titulo: "Quitar componente" });
    if (!ok) return;

    estado.componentes.splice(idx, 1);

    if (editandoComponenteIdx === idx) {
        cancelarEdicionComponente();
    } else if (editandoComponenteIdx !== null && editandoComponenteIdx > idx) {
        editandoComponenteIdx -= 1;
    }

    pintarComponentes();
}

async function agregarComponente() {
    const tipo = tipoComponente ? tipoComponente.value : "";
    const inventarioId = componenteInventario ? componenteInventario.value || null : null;
    const cantidadComprada = Number(valor("cantidadComprada"));
    const precioCompra = Number(valor("precioCompra"));
    const cantidadUtilizada = Number(valor("cantidadUtilizada"));

    if (!tipo) {
        await mostrarAviso("Seleccioná un tipo de componente.");
        return;
    }
    if (inventarioId && !obtenerComponentePorId(inventarioId)) {
        await mostrarAviso("El componente elegido ya no está en el inventario. Volvé a seleccionarlo.", {
            titulo: "Material no disponible",
        });
        return;
    }
    if (valor("cantidadComprada") === "" || !Number.isInteger(cantidadComprada) || cantidadComprada <= 0) {
        await mostrarAviso("La cantidad comprada debe ser un número entero mayor a 0.", { titulo: "Revisá el dato" });
        return;
    }
    if (valor("precioCompra") === "" || !Number.isFinite(precioCompra) || precioCompra < 0) {
        await mostrarAviso("El precio de compra no puede ser negativo.", { titulo: "Revisá el dato" });
        return;
    }
    if (valor("cantidadUtilizada") === "" || !Number.isInteger(cantidadUtilizada) || cantidadUtilizada < 0) {
        await mostrarAviso("La cantidad utilizada debe ser un número entero (0 o más).", { titulo: "Revisá el dato" });
        return;
    }
    if (
        cantidadUtilizada > cantidadComprada &&
        !(await confirmar("La cantidad usada es mayor a la comprada. ¿Continuar?", {
            titulo: "Cantidad fuera de rango",
        }))
    ) {
        return;
    }

    const nuevo = { tipo, cantidadComprada, precioCompra, cantidadUtilizada, inventarioId };

    if (editandoComponenteIdx !== null) {
        if (estado.componentes[editandoComponenteIdx]) estado.componentes[editandoComponenteIdx] = nuevo;
        cancelarEdicionComponente();
    } else {
        estado.componentes.push(nuevo);
        ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        if (componenteInventario) componenteInventario.value = "";
        actualizarInfoSelectores();
    }

    pintarComponentes();
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
/**
 * Calcula el costo y arma los materiales usados a partir de la calculadora.
 * Fuente única de verdad para el coste (evita duplicar la fórmula).
 */
function calcularCostoActual() {
    // El valor por hora es opcional: si no está cargado, la mano de obra no se
    // suma al total y la interfaz lo avisa (no bloquea el cálculo).
    const horas = num("horasTrabajadas");
    const valorHora = valor("valorHoras") !== "" ? num("valorHoras") : 0;

    const costo = {
        lanas: calcularLana(num("precioOvillo"), num("gramosOvillo"), num("gramosUsados")),
        relleno: calcularRelleno(num("precioRelleno"), num("gramosRelleno"), num("rellenoUsado")),
        componentes: calcularTotalComponentes(estado.componentes),
        manoObra: calcularManoObra(horas, valorHora),
    };
    costo.total = costo.lanas + costo.relleno + costo.componentes + costo.manoObra;
    costo.precioIdeal = calcularPrecioIdeal(costo.total);

    // Precio de venta y margen (opcionales; el precio manual tiene prioridad).
    const margenIngresado = valor("margenGanancia") !== "" ? num("margenGanancia") : null;
    const precioManual = valor("precioVentaManual") !== "" ? num("precioVentaManual") : null;
    const venta = calcularVenta(costo.total, precioManual, margenIngresado);
    costo.precioVenta = venta.precioVenta;
    costo.ganancia = venta.ganancia;
    costo.margen = venta.margen;

    const materialesUsados = {
        lana: {
            inventarioId: valor("lanaInventarioId") || null,
            color: texto("colorLana"),
            marca: texto("marcaLana"),
            gramosUsados: num("gramosUsados"),
        },
        relleno: {
            inventarioId: valor("rellenoInventarioId") || null,
            tipo: texto("tipoRelleno"),
            marca: texto("marcaRelleno"),
            gramosUsados: num("rellenoUsado"),
        },
        componentes: JSON.parse(JSON.stringify(estado.componentes)),
    };

    return { costo, materialesUsados };
}

function validarCalculadora() {
    const errores = [];

    const negativos = [
        ["precioOvillo", "precio del ovillo"],
        ["gramosOvillo", "gramos del ovillo"],
        ["gramosUsados", "gramos usados"],
        ["precioRelleno", "precio del relleno"],
        ["gramosRelleno", "gramos totales de relleno"],
        ["rellenoUsado", "relleno usado"],
        ["horasTrabajadas", "horas trabajadas"],
        ["valorHoras", "valor por hora"],
        ["margenGanancia", "margen de ganancia"],
        ["precioVentaManual", "precio de venta"],
    ];
    negativos.forEach(([id, etiqueta]) => {
        if (valor(id) !== "" && (Number.isNaN(num(id)) || num(id) < 0)) {
            errores.push(`"${etiqueta}" no puede ser negativo.`);
        }
    });

    // Los materiales vinculados al inventario deben seguir existiendo al
    // momento de calcular (pudieron eliminarse desde la otra sección).
    const lanaId = valor("lanaInventarioId");
    if (lanaId && !obtenerLanaPorId(lanaId)) {
        errores.push("La lana elegida ya no está en el inventario. Volvé a seleccionarla.");
    }
    const rellenoId = valor("rellenoInventarioId");
    if (rellenoId && !obtenerRellenoPorId(rellenoId)) {
        errores.push("El relleno elegido ya no está en el inventario. Volvé a seleccionarlo.");
    }
    const componenteInvalido = estado.componentes.find(
        (c) => c.inventarioId && !obtenerComponentePorId(c.inventarioId)
    );
    if (componenteInvalido) {
        errores.push(
            `El componente "${componenteInvalido.tipo}" ya no está en el inventario. Volvé a seleccionarlo o quitá el vínculo.`
        );
    }

    // Lana: si usás gramos, necesitás precio y gramos del ovillo
    if (num("gramosUsados") > 0) {
        if (valor("precioOvillo") === "" || num("precioOvillo") <= 0) {
            errores.push("Completá el precio del ovillo (mayor a 0) para calcular la lana usada.");
        }
        if (valor("gramosOvillo") === "" || num("gramosOvillo") <= 0) {
            errores.push("Completá los gramos del ovillo (mayor a 0).");
        }
    } else if (valor("gramosOvillo") !== "" && num("gramosOvillo") <= 0) {
        errores.push("Los gramos del ovillo deben ser mayores a 0.");
    }

    // Relleno: si usás gramos, necesitás precio y gramos totales
    if (num("rellenoUsado") > 0) {
        if (valor("precioRelleno") === "" || num("precioRelleno") <= 0) {
            errores.push("Completá el precio del relleno (mayor a 0) para calcular el relleno usado.");
        }
        if (valor("gramosRelleno") === "" || num("gramosRelleno") <= 0) {
            errores.push("Completá los gramos totales de relleno (mayor a 0).");
        }
    } else if (valor("gramosRelleno") !== "" && num("gramosRelleno") <= 0) {
        errores.push("Los gramos totales de relleno deben ser mayores a 0.");
    }

    // Mano de obra: el valor por hora es opcional. Si hay horas pero no valor,
    // se calcula igual y la mano de obra queda fuera del total (se avisa en
    // los resultados). Sólo se valida que los números no sean negativos.

    // Sin datos
    const hayDatos =
        [
            "colorLana",
            "marcaLana",
            "precioOvillo",
            "gramosOvillo",
            "gramosUsados",
            "tipoRelleno",
            "marcaRelleno",
            "precioRelleno",
            "gramosRelleno",
            "rellenoUsado",
            "cantidadComprada",
            "precioCompra",
            "cantidadUtilizada",
            "horasTrabajadas",
            "valorHoras",
        ].some((id) => valor(id) !== "") || estado.componentes.length > 0;

    if (!hayDatos) {
        errores.push("No hay datos para calcular. Completá al menos una sección.");
    }

    return errores;
}

function mostrarErroresCalculadora(errores) {
    const cont = document.getElementById("erroresCalculadora");
    if (!cont) return;

    if (!errores.length) {
        cont.innerHTML = "";
        cont.style.display = "none";
        return;
    }

    cont.innerHTML =
        "<strong>Revisá estos datos:</strong><ul>" + errores.map((e) => `<li>${escapeHtml(e)}</li>`).join("") + "</ul>";
    cont.style.display = "block";
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function calcularTodo() {
    const errores = validarCalculadora();
    mostrarErroresCalculadora(errores);
    if (errores.length) {
        if (resultados) resultados.style.display = "none";
        return;
    }

    const { costo } = calcularCostoActual();
    const horas = num("horasTrabajadas");
    const sinValorHora = horas > 0 && valor("valorHoras") === "";

    document.getElementById("resLanas").textContent = formatearMoneda(costo.lanas);
    document.getElementById("resRelleno").textContent = formatearMoneda(costo.relleno);
    document.getElementById("resComponentes").textContent = formatearMoneda(costo.componentes);
    document.getElementById("resManoObra").textContent = sinValorHora ? "—" : formatearMoneda(costo.manoObra);
    document.getElementById("resTotal").textContent = formatearMoneda(costo.total);
    document.getElementById("resPrecioIdeal").textContent = formatearMoneda(costo.precioIdeal);

    const avisoManoObra = document.getElementById("avisoManoObra");
    if (avisoManoObra) {
        avisoManoObra.style.display = sinValorHora ? "block" : "none";
        avisoManoObra.textContent = sinValorHora
            ? "ℹ️ No se sumó mano de obra porque el valor por hora está vacío. Podés cargarlo si querés incluirla."
            : "";
    }

    const hayVenta = costo.precioVenta > 0;
    document.getElementById("resPrecioVenta").textContent = hayVenta ? formatearMoneda(costo.precioVenta) : "—";
    document.getElementById("resGanancia").textContent = hayVenta ? formatearMoneda(costo.ganancia) : "—";
    document.getElementById("resMargen").textContent = hayVenta ? `${costo.margen.toFixed(1)} %` : "—";

    // Recordamos el valor por hora usado como valor por defecto.
    const valorHoraUsado = num("valorHoras");
    if (valorHoraUsado > 0) {
        const config = cargarConfig();
        config.valorHora = valorHoraUsado;
        guardarConfig(config);
    }

    mostrarDesgloseComponentes(estado.componentes, document.getElementById("desgloseComponentes"));
    pintarComponentes();

    if (resultados) {
        resultados.style.display = "block";
        resultados.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    await aplicarDescuentoInventario();
}

function limpiarTodo() {
    [
        "colorLana",
        "marcaLana",
        "precioOvillo",
        "gramosOvillo",
        "gramosUsados",
        "tipoRelleno",
        "marcaRelleno",
        "precioRelleno",
        "gramosRelleno",
        "rellenoUsado",
        "tipoComponente",
        "cantidadComprada",
        "precioCompra",
        "cantidadUtilizada",
        "horasTrabajadas",
        "valorHoras",
        "nombreProyectoCalc",
        "margenGanancia",
        "precioVentaManual",
        "lanaInventarioId",
        "rellenoInventarioId",
        "componenteInventarioId",
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    renderSelectoresInventario();
    aplicarValorHoraPorDefecto();

    estado.componentes.length = 0;
    editandoComponenteIdx = null;
    pintarComponentes();

    firmaDescontada = null;

    const desglose = document.getElementById("desgloseComponentes");
    if (desglose) desglose.innerHTML = "";

    resultados.style.display = "none";

    const avisoStock = document.getElementById("avisoStock");
    if (avisoStock) avisoStock.textContent = "";

    const avisoManoObra = document.getElementById("avisoManoObra");
    if (avisoManoObra) {
        avisoManoObra.textContent = "";
        avisoManoObra.style.display = "none";
    }

    mostrarErroresCalculadora([]);

    if (tipoComponente) mostrarComponente(datosComponentes, tipoComponente);
}

// ---------------------------------------------------------------------------
// Snapshot de entradas del proyecto
// ---------------------------------------------------------------------------
const CAMPOS_ENTRADA = [
    "colorLana",
    "marcaLana",
    "precioOvillo",
    "gramosOvillo",
    "gramosUsados",
    "tipoRelleno",
    "marcaRelleno",
    "precioRelleno",
    "gramosRelleno",
    "rellenoUsado",
    "horasTrabajadas",
    "valorHoras",
    "margenGanancia",
    "precioVentaManual",
];

/**
 * Guarda exactamente lo que el usuario cargó en la calculadora, para poder
 * reabrir el proyecto sin depender de que el inventario no haya cambiado.
 */
function capturarEntradas() {
    return {
        version: 1,
        lana: {
            inventarioId: valor("lanaInventarioId") || null,
            color: texto("colorLana"),
            marca: texto("marcaLana"),
            precioOvillo: valor("precioOvillo"),
            gramosOvillo: valor("gramosOvillo"),
            gramosUsados: valor("gramosUsados"),
        },
        relleno: {
            inventarioId: valor("rellenoInventarioId") || null,
            tipo: texto("tipoRelleno"),
            marca: texto("marcaRelleno"),
            precioRelleno: valor("precioRelleno"),
            gramosRelleno: valor("gramosRelleno"),
            rellenoUsado: valor("rellenoUsado"),
        },
        manoObra: {
            horasTrabajadas: valor("horasTrabajadas"),
            valorHoras: valor("valorHoras"),
        },
        venta: {
            margenGanancia: valor("margenGanancia"),
            precioVentaManual: valor("precioVentaManual"),
        },
        componentes: estado.componentes.map((componente) => ({ ...componente })),
    };
}

function asignarEntrada(id, valorCampo) {
    const el = document.getElementById(id);
    if (el) el.value = valorCampo == null ? "" : String(valorCampo);
}

function limpiarFormularioCalculo() {
    [
        ...CAMPOS_ENTRADA,
        "nombreProyectoCalc",
        "lanaInventarioId",
        "rellenoInventarioId",
        "componenteInventarioId",
    ].forEach((id) => asignarEntrada(id, ""));
    if (tipoComponente) tipoComponente.value = "";
    ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => asignarEntrada(id, ""));

    estado.componentes = [];
    editandoComponenteIdx = null;
    pintarComponentes();
    renderSelectoresInventario();
    actualizarInfoSelectores();

    firmaDescontada = null;
    if (resultados) resultados.style.display = "none";
    const desglose = document.getElementById("desgloseComponentes");
    if (desglose) desglose.innerHTML = "";
    const avisoStock = document.getElementById("avisoStock");
    if (avisoStock) avisoStock.textContent = "";
    mostrarErroresCalculadora([]);
    if (tipoComponente) mostrarComponente(datosComponentes, tipoComponente);
}

function componenteDesdeSnapshot(componente) {
    if (!esObjeto(componente)) return null;
    const tipo = String(componente.tipo || "").trim();
    if (!tipo) return null;

    const inventarioId = componente.inventarioId || null;
    return {
        tipo,
        cantidadComprada: Number(componente.cantidadComprada) || 0,
        precioCompra: Number(componente.precioCompra) || 0,
        cantidadUtilizada: Number(componente.cantidadUtilizada) || 0,
        inventarioId: inventarioId && obtenerComponentePorId(inventarioId) ? inventarioId : null,
    };
}

/**
 * Restaura la calculadora con la snapshot guardada en el proyecto.
 * Para proyectos viejos (sin snapshot) precarga lo que haya en
 * `materialesUsados`; los precios/gramajes que no se guardaban quedan vacíos.
 */
function restaurarEntradasProyecto(proyecto) {
    if (!proyecto) return;

    const entradas = esObjeto(proyecto.entradas) ? proyecto.entradas : null;
    const materiales = esObjeto(proyecto.materialesUsados) ? proyecto.materialesUsados : {};

    const lana = entradas && esObjeto(entradas.lana) ? entradas.lana : esObjeto(materiales.lana) ? materiales.lana : {};
    const relleno =
        entradas && esObjeto(entradas.relleno)
            ? entradas.relleno
            : esObjeto(materiales.relleno)
              ? materiales.relleno
              : {};
    const manoObra = entradas && esObjeto(entradas.manoObra) ? entradas.manoObra : {};
    const venta = entradas && esObjeto(entradas.venta) ? entradas.venta : {};

    limpiarFormularioCalculo();

    const lanaId = lana.inventarioId && obtenerLanaPorId(lana.inventarioId) ? lana.inventarioId : "";
    const rellenoId = relleno.inventarioId && obtenerRellenoPorId(relleno.inventarioId) ? relleno.inventarioId : "";
    const desvinculados = [];

    if (lana.inventarioId && !lanaId) desvinculados.push("lana");
    if (relleno.inventarioId && !rellenoId) desvinculados.push("relleno");

    asignarEntrada("lanaInventarioId", lanaId);
    asignarEntrada("colorLana", lana.color);
    asignarEntrada("marcaLana", lana.marca);
    asignarEntrada("precioOvillo", lana.precioOvillo);
    asignarEntrada("gramosOvillo", lana.gramosOvillo);
    asignarEntrada("gramosUsados", lana.gramosUsados);

    asignarEntrada("rellenoInventarioId", rellenoId);
    asignarEntrada("tipoRelleno", relleno.tipo);
    asignarEntrada("marcaRelleno", relleno.marca);
    asignarEntrada("precioRelleno", relleno.precioRelleno);
    asignarEntrada("gramosRelleno", relleno.gramosRelleno);
    asignarEntrada(
        "rellenoUsado",
        entradas && esObjeto(entradas.relleno) ? relleno.rellenoUsado : relleno.gramosUsados
    );

    asignarEntrada("horasTrabajadas", manoObra.horasTrabajadas);
    asignarEntrada("valorHoras", manoObra.valorHoras);
    asignarEntrada("margenGanancia", venta.margenGanancia);
    asignarEntrada("precioVentaManual", venta.precioVentaManual);

    const componentes = Array.isArray(entradas?.componentes)
        ? entradas.componentes
        : Array.isArray(materiales.componentes)
          ? materiales.componentes
          : [];
    estado.componentes = componentes.map(componenteDesdeSnapshot).filter(Boolean);

    const componentesDesaparecidos = componentes.some(
        (c) => esObjeto(c) && c.inventarioId && !obtenerComponentePorId(c.inventarioId)
    );
    if (componentesDesaparecidos) desvinculados.push("componentes");

    pintarComponentes();
    renderSelectoresInventario();
    actualizarInfoSelectores();

    if (desvinculados.length) {
        mostrarAvisoGlobal(
            `ℹ️ Algunos materiales guardados ya no están en el inventario (${desvinculados.join(", ")}). Se cargaron como manuales y no descontarán stock.`,
            "info"
        );
    }
}

document.addEventListener("proyecto-para-calcular", (evento) => {
    const proyecto = evento.detail?.proyecto;
    if (proyecto) restaurarEntradasProyecto(proyecto);
});

// Firma del último cálculo que descontó stock: evita descontar dos veces si se
// aprieta "Calcular" repetidamente sin cambiar los datos.
let firmaDescontada = null;

function firmaCalculo() {
    return JSON.stringify({
        lana: [valor("lanaInventarioId"), texto("colorLana"), texto("marcaLana"), num("gramosUsados")],
        relleno: [valor("rellenoInventarioId"), texto("tipoRelleno"), texto("marcaRelleno"), num("rellenoUsado")],
        componentes: estado.componentes.map((c) => [c.inventarioId, c.tipo, c.cantidadUtilizada]),
    });
}

/**
 * Descuenta stock del inventario al presionar Calcular.
 *
 * Reglas:
 * - Sólo se descuenta lo que el usuario vinculó explícitamente por id desde
 *   los selectores del inventario.
 * - El cálculo se hace sobre una copia: si el usuario cancela, no se muta nada.
 * - Si no hay materiales vinculados, se calcula el costo pero no se toca stock.
 */
async function aplicarDescuentoInventario() {
    const aviso = document.getElementById("avisoStock");

    const firma = firmaCalculo();
    if (firma === firmaDescontada) {
        if (aviso) {
            aviso.textContent =
                "ℹ️ Este cálculo ya se descontó del inventario (Limpiá o cambiá los datos para volver a descontar).";
        }
        return;
    }

    const gramosLana = num("gramosUsados");
    const gramosRelleno = num("rellenoUsado");
    const lanaId = valor("lanaInventarioId") || "";
    const rellenoId = valor("rellenoInventarioId") || "";

    const solicitudes = [];
    const sinVincular = [];

    if (gramosLana > 0) {
        if (lanaId) {
            solicitudes.push({
                tipo: "lana",
                inventarioId: lanaId,
                etiqueta: etiquetaLana(obtenerLanaPorId(lanaId)) || "Lana seleccionada",
                unidad: "g",
                pedido: gramosLana,
            });
        } else {
            sinVincular.push("lana");
        }
    }

    if (gramosRelleno > 0) {
        if (rellenoId) {
            solicitudes.push({
                tipo: "relleno",
                inventarioId: rellenoId,
                etiqueta: etiquetaRelleno(obtenerRellenoPorId(rellenoId)) || "Relleno seleccionado",
                unidad: "g",
                pedido: gramosRelleno,
            });
        } else {
            sinVincular.push("relleno");
        }
    }

    estado.componentes.forEach((componente) => {
        const pedido = Number(componente.cantidadUtilizada) || 0;
        if (pedido <= 0) return;
        if (!componente.inventarioId) {
            sinVincular.push("componente");
            return;
        }
        solicitudes.push({
            tipo: "componente",
            inventarioId: componente.inventarioId,
            etiqueta: etiquetaComponente(obtenerComponentePorId(componente.inventarioId)) || componente.tipo,
            unidad: "ud",
            pedido,
        });
    });

    if (!solicitudes.length) {
        if (aviso) {
            aviso.textContent = sinVincular.length
                ? "ℹ️ No se descontó stock: los materiales usados no están vinculados al inventario. Elegilos desde los desplegables."
                : "ℹ️ No se descontó stock: no hay materiales del inventario vinculados a este cálculo.";
        }
        return;
    }

    // Se trabaja sobre una copia: el inventario real sólo se reemplaza después
    // de la confirmación explícita.
    const preview = JSON.parse(JSON.stringify(estado.inventario));

    solicitudes.forEach((solicitud) => {
        let resultado;
        if (solicitud.tipo === "lana") {
            resultado = descontarLanaPorId(preview, {
                inventarioId: solicitud.inventarioId,
                gramosUsados: solicitud.pedido,
            });
        } else if (solicitud.tipo === "relleno") {
            resultado = descontarRellenoPorId(preview, {
                inventarioId: solicitud.inventarioId,
                gramosUsados: solicitud.pedido,
            });
        } else {
            const { detalle } = descontarComponentes(preview, [
                {
                    inventarioId: solicitud.inventarioId,
                    cantidadUtilizada: solicitud.pedido,
                },
            ]);
            resultado = detalle[0] || { encontrado: false, descontado: 0, disponible: 0 };
        }

        solicitud.encontrado = !!resultado.encontrado;
        solicitud.disponible = Number(resultado.disponible) || 0;
        solicitud.descontado = Number(resultado.descontado) || 0;
    });

    const conDescuento = solicitudes.filter((s) => s.descontado > 0);
    const faltantes = solicitudes
        .filter((s) => !s.encontrado || s.descontado < s.pedido)
        .map((s) => {
            if (!s.encontrado) return `${s.etiqueta}: ya no está en el inventario`;
            const falta = Number((s.pedido - s.descontado).toFixed(3));
            return `${s.etiqueta}: faltaron ${formatearCantidadUnidad(falta, s.unidad)} (había ${formatearCantidadUnidad(s.disponible, s.unidad)})`;
        });

    if (!conDescuento.length) {
        if (aviso) {
            let mensaje = "ℹ️ No se descontó stock: no hay unidades disponibles de los materiales elegidos.";
            if (faltantes.length) mensaje += " " + faltantes.join(" · ");
            aviso.textContent = mensaje;
        }
        return;
    }

    const lineas = conDescuento.map((s) => {
        const base = `• ${s.etiqueta}: ${formatearCantidadUnidad(s.descontado, s.unidad)}`;
        if (s.descontado < s.pedido) {
            return `${base} de ${formatearCantidadUnidad(s.pedido, s.unidad)} pedidos (había ${formatearCantidadUnidad(s.disponible, s.unidad)})`;
        }
        return base;
    });

    // Los faltantes parciales ya se ven en cada línea; en la confirmación sólo
    // repetimos los materiales que desaparecieron del inventario.
    const noEncontrados = solicitudes
        .filter((s) => !s.encontrado)
        .map((s) => `${s.etiqueta}: ya no está en el inventario`);
    const mensajeConfirmacion =
        "¿Descontar del inventario?\n\n" +
        lineas.join("\n") +
        (noEncontrados.length ? "\n\n⚠️ " + noEncontrados.join("\n⚠️ ") : "");

    const confirmado = await confirmar(mensajeConfirmacion, {
        titulo: "Confirmar descuento",
        ok: "Sí, descontar",
    });
    if (!confirmado) {
        if (aviso) aviso.textContent = "ℹ️ No se descontó stock (cancelado).";
        return;
    }

    estado.inventario = preview;
    const guardado = guardarInventario(estado.inventario);
    renderInventario();

    if (aviso) {
        let mensaje = guardado
            ? "✔️ Stock descontado → " + lineas.map((linea) => linea.replace("• ", "")).join(" · ")
            : "⚠️ Stock descontado, pero no se pudo guardar en el dispositivo. Exportá un backup.";
        if (faltantes.length) mensaje += " · ⚠️ " + faltantes.join(" · ");
        if (sinVincular.length) mensaje += " · ℹ️ Los materiales sin vincular no descontaron stock.";
        aviso.textContent = mensaje;
    }
    firmaDescontada = firma;
}

// ---------------------------------------------------------------------------
// Guardar el cálculo como proyecto (o sobre el proyecto seleccionado)
// ---------------------------------------------------------------------------
const btnGuardarDesdeCalculadora = document.getElementById("btnGuardarDesdeCalculadora");
if (btnGuardarDesdeCalculadora) {
    btnGuardarDesdeCalculadora.addEventListener("click", async () => {
        const seleccionado = obtenerProyectoSeleccionado();
        let nombre;

        if (seleccionado) {
            nombre = seleccionado.nombre;
        } else {
            nombre = texto("nombreProyectoCalc");
            if (!nombre) {
                await mostrarAviso("Escribí un nombre para el proyecto antes de guardarlo.", {
                    titulo: "Falta el nombre",
                });
                return;
            }
        }

        const { costo, materialesUsados } = calcularCostoActual();
        const entradas = capturarEntradas();

        if (seleccionado) {
            seleccionado.costo = costo;
            seleccionado.materialesUsados = materialesUsados;
            seleccionado.entradas = entradas;
            seleccionado.estado = "terminado";
            seleccionado.fechaModificacion = new Date().toISOString();
            guardarProyectos(estado.proyectos);
            renderProyectos();
            renderBannerProyecto();
            await mostrarAviso(`Cálculo guardado en "${seleccionado.nombre}".`, { titulo: "Proyecto actualizado" });
        } else {
            const nuevo = crearProyecto(nombre, "amigurumi", "");
            nuevo.costo = costo;
            nuevo.materialesUsados = materialesUsados;
            nuevo.entradas = entradas;
            nuevo.estado = "terminado";
            estado.proyectos.unshift(nuevo);
            guardarProyectos(estado.proyectos);
            renderProyectos();
            document.getElementById("nombreProyectoCalc").value = "";
            await mostrarAviso("Proyecto guardado correctamente.", { titulo: "Guardado" });
        }
    });
}
