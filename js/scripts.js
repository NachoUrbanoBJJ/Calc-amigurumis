import { calcularLana, calcularRelleno, calcularManoObra, calcularTotalComponentes } from "./calculos.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";
import {
    cargarProyectos,
    guardarProyectos,
    crearProyecto,
    normalizarProyecto,
    generarId,
    agregarSeccion,
    eliminarSeccion,
    cargarPatrones,
    guardarPatrones,
    agregarPatron,
    generarCodigoPatron,
    normalizarPatrones,
    eliminarPatron
} from "./planificador.js";
import {
    cargarInventario,
    guardarInventario,
    agregarLanaInventario,
    agregarRellenoInventario,
    agregarComponenteInventario,
    descontarLana,
    descontarRelleno,
    descontarComponentes
} from "./inventario.js";

// ---------------------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------------------
const componentes = [];                 // componentes de la calculadora (actual)
let proyectos = cargarProyectos();      // todos los proyectos (planificando o terminados)
let proyectoActivo = null;              // proyecto abierto en el editor de secciones
let proyectoSeleccionadoId = null;      // proyecto que recibirá el cálculo de la calculadora
let proyectoRevisadoId = null;          // proyecto expandido (revisar) en la lista
let patrones = cargarPatrones();
let patronBusqueda = "";                // texto del buscador de patrones
let patronCategoriaFiltro = "";         // categoría activa ("" = todas)
let patronRevisadoId = null;            // patrón expandido (ver) en la lista
let patronEditandoId = null;            // patrón en edición (null = alta nueva)
let materialesForm = [];                // materiales que se están cargando en el formulario de patrón
let inventario = cargarInventario();

// ---------------------------------------------------------------------------
// Configuración persistente (valores por defecto)
// ---------------------------------------------------------------------------
const STORAGE_KEY_CONFIG = "calc-amigurumis-config-v1";

function cargarConfig() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}") || {};
    } catch (e) {
        return {};
    }
}

function guardarConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
        console.warn("No se pudo guardar la configuración", e);
    }
}

function aplicarValorHoraPorDefecto() {
    const input = document.getElementById("valorHoras");
    if (!input || input.value !== "") return;
    const config = cargarConfig();
    if (config.valorHora) input.value = String(config.valorHora);
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
}

function irASeccion(nombre) {
    document.querySelectorAll(".nav-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.section === nombre);
    });
    document.querySelectorAll(".section").forEach((s) => {
        s.classList.toggle("active", s.id === `section-${nombre}`);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function num(id) {
    return Number(document.getElementById(id).value) || 0;
}

function texto(id) {
    return document.getElementById(id).value.trim();
}

function valor(id) {
    return document.getElementById(id).value;
}

function normalizar(t) {
    return String(t == null ? "" : t).trim().toLowerCase();
}

function limpiarCampos(ids) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------
document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => irASeccion(btn.dataset.section));
});

// ---------------------------------------------------------------------------
// Calculadora
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

function agregarComponente() {
    const tipo = tipoComponente ? tipoComponente.value : "";
    const cantidadComprada = Number(valor("cantidadComprada"));
    const precioCompra = Number(valor("precioCompra"));
    const cantidadUtilizada = Number(valor("cantidadUtilizada"));

    if (!tipo) { alert("Seleccioná un tipo de componente."); return; }
    if (valor("cantidadComprada") === "" || !Number.isInteger(cantidadComprada) || cantidadComprada <= 0) {
        alert("La cantidad comprada debe ser un número entero mayor a 0.");
        return;
    }
    if (valor("precioCompra") === "" || !Number.isFinite(precioCompra) || precioCompra < 0) {
        alert("El precio de compra no puede ser negativo.");
        return;
    }
    if (valor("cantidadUtilizada") === "" || !Number.isInteger(cantidadUtilizada) || cantidadUtilizada < 0) {
        alert("La cantidad utilizada debe ser un número entero (0 o más).");
        return;
    }
    if (cantidadUtilizada > cantidadComprada && !confirm("La cantidad usada es mayor a la comprada. ¿Continuar?")) return;

    componentes.push({ tipo, cantidadComprada, precioCompra, cantidadUtilizada });

    document.getElementById("cantidadComprada").value = "";
    document.getElementById("precioCompra").value = "";
    document.getElementById("cantidadUtilizada").value = "";

    mostrarListaComponentes(componentes, listaComponentes);
}

/**
 * Calcula el costo y arma los materiales usados a partir de la calculadora.
 * Fuente única de verdad para el coste (evita duplicar la fórmula).
 */
function calcularCostoActual() {
    const costo = {
        lanas: calcularLana(num("precioOvillo"), num("gramosOvillo"), num("gramosUsados")),
        relleno: calcularRelleno(num("precioRelleno"), num("gramosRelleno"), num("rellenoUsado")),
        componentes: calcularTotalComponentes(componentes),
        manoObra: calcularManoObra(num("horasTrabajadas"), num("valorHoras")),
    };
    costo.total = costo.lanas + costo.relleno + costo.componentes + costo.manoObra;

    // Precio de venta y margen (el precio manual tiene prioridad sobre el margen)
    const margenIngresado = valor("margenGanancia") !== "" ? num("margenGanancia") : null;
    const precioManual = valor("precioVentaManual") !== "" ? num("precioVentaManual") : null;

    let precioVenta = null;
    if (precioManual !== null && precioManual > 0) {
        precioVenta = precioManual;
    } else if (margenIngresado !== null && margenIngresado >= 0) {
        precioVenta = costo.total * (1 + margenIngresado / 100);
    }

    if (precioVenta !== null && precioVenta > 0) {
        const ganancia = precioVenta - costo.total;
        costo.precioVenta = Number(precioVenta.toFixed(2));
        costo.ganancia = Number(ganancia.toFixed(2));
        costo.margen = costo.total > 0 ? Number(((ganancia / costo.total) * 100).toFixed(2)) : 0;
    } else {
        costo.precioVenta = 0;
        costo.ganancia = 0;
        costo.margen = 0;
    }

    const materialesUsados = {
        lana: { color: texto("colorLana"), marca: texto("marcaLana"), gramosUsados: num("gramosUsados") },
        relleno: { tipo: texto("tipoRelleno"), marca: texto("marcaRelleno"), gramosUsados: num("rellenoUsado") },
        componentes: JSON.parse(JSON.stringify(componentes)),
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

    // Mano de obra: si hay horas, hace falta el valor por hora
    if (num("horasTrabajadas") > 0 && (valor("valorHoras") === "" || num("valorHoras") <= 0)) {
        errores.push("Completá el valor por hora (mayor a 0) para calcular la mano de obra.");
    }

    // Sin datos
    const hayDatos =
        [
            "colorLana", "marcaLana", "precioOvillo", "gramosOvillo", "gramosUsados",
            "tipoRelleno", "marcaRelleno", "precioRelleno", "gramosRelleno", "rellenoUsado",
            "cantidadComprada", "precioCompra", "cantidadUtilizada",
            "horasTrabajadas", "valorHoras"
        ].some((id) => valor(id) !== "") || componentes.length > 0;

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
        "<strong>Revisá estos datos:</strong><ul>" +
        errores.map((e) => `<li>${escapeHtml(e)}</li>`).join("") +
        "</ul>";
    cont.style.display = "block";
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function calcularTodo() {
    const errores = validarCalculadora();
    mostrarErroresCalculadora(errores);
    if (errores.length) {
        resultados.style.display = "none";
        return;
    }

    const { costo } = calcularCostoActual();

    document.getElementById("resLanas").textContent = formatearMoneda(costo.lanas);
    document.getElementById("resRelleno").textContent = formatearMoneda(costo.relleno);
    document.getElementById("resComponentes").textContent = formatearMoneda(costo.componentes);
    document.getElementById("resManoObra").textContent = formatearMoneda(costo.manoObra);
    document.getElementById("resTotal").textContent = formatearMoneda(costo.total);

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

    mostrarDesgloseComponentes(componentes, document.getElementById("desgloseComponentes"));
    mostrarListaComponentes(componentes, listaComponentes);

    resultados.style.display = "block";
    resultados.scrollIntoView({ behavior: "smooth", block: "nearest" });

    aplicarDescuentoInventario();
}

function limpiarTodo() {
    [
        "colorLana", "marcaLana", "precioOvillo", "gramosOvillo", "gramosUsados",
        "tipoRelleno", "marcaRelleno", "precioRelleno", "gramosRelleno", "rellenoUsado",
        "tipoComponente", "cantidadComprada", "precioCompra", "cantidadUtilizada",
        "horasTrabajadas", "valorHoras", "nombreProyectoCalc",
        "margenGanancia", "precioVentaManual"
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    aplicarValorHoraPorDefecto();

    componentes.length = 0;
    mostrarListaComponentes(componentes, listaComponentes);

    const desglose = document.getElementById("desgloseComponentes");
    if (desglose) desglose.innerHTML = "";

    resultados.style.display = "none";

    const avisoStock = document.getElementById("avisoStock");
    if (avisoStock) avisoStock.textContent = "";

    mostrarErroresCalculadora([]);

    if (tipoComponente) mostrarComponente(datosComponentes, tipoComponente);
}

/**
 * Descuenta stock del inventario (al presionar Calcular, con confirmación).
 * Si no hay material coincidente: calcula pero no actualiza el inventario.
 */
function aplicarDescuentoInventario() {
    const aviso = document.getElementById("avisoStock");

    const antes = JSON.parse(JSON.stringify(inventario));
    const preview = JSON.parse(JSON.stringify(inventario));

    descontarLana(preview, { color: texto("colorLana"), marca: texto("marcaLana"), gramosUsados: num("gramosUsados") });
    descontarRelleno(preview, { tipo: texto("tipoRelleno"), marca: texto("marcaRelleno"), gramosUsados: num("rellenoUsado") });
    descontarComponentes(preview, componentes);

    let gramosLana = 0;
    antes.lanas.forEach((l, i) => { gramosLana += l.gramosDisponibles - preview.lanas[i].gramosDisponibles; });
    let gramosRelleno = 0;
    antes.rellenos.forEach((r, i) => { gramosRelleno += r.gramosDisponibles - preview.rellenos[i].gramosDisponibles; });
    let componentesDescontados = 0;
    antes.componentes.forEach((c, i) => { componentesDescontados += c.cantidadDisponible - preview.componentes[i].cantidadDisponible; });

    gramosLana = Number(gramosLana.toFixed(3));
    gramosRelleno = Number(gramosRelleno.toFixed(3));

    const hayDescuento = gramosLana > 0 || gramosRelleno > 0 || componentesDescontados > 0;
    if (!hayDescuento) {
        if (aviso) aviso.textContent = "ℹ️ No se descontó stock: no hay material coincidente en el inventario.";
        return;
    }

    const detalle = [];
    if (gramosLana > 0) detalle.push(`• Lana: ${gramosLana} g`);
    if (gramosRelleno > 0) detalle.push(`• Relleno: ${gramosRelleno} g`);
    if (componentesDescontados > 0) detalle.push(`• Componentes: ${componentesDescontados} ud.`);

    if (!confirm("¿Descontar del inventario?\n\n" + detalle.join("\n"))) {
        if (aviso) aviso.textContent = "ℹ️ No se descontó stock (cancelado).";
        return;
    }

    inventario = preview;
    guardarInventario(inventario);
    renderInventario();
    if (aviso) {
        aviso.textContent = "✔️ Stock descontado del inventario → " + detalle.map((d) => d.replace("• ", "")).join(" · ");
    }
}

// ---------------------------------------------------------------------------
// Proyecto seleccionado (destino del cálculo)
// ---------------------------------------------------------------------------
const bannerProyecto = document.getElementById("bannerProyecto");
const bannerProyectoNombre = document.getElementById("bannerProyectoNombre");

function obtenerProyectoSeleccionado() {
    if (!proyectoSeleccionadoId) return null;
    return proyectos.find((p) => p.id === proyectoSeleccionadoId) || null;
}

function renderBannerProyecto() {
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
        proyectoSeleccionadoId = null;
        renderBannerProyecto();
    });
}

const btnGuardarDesdeCalculadora = document.getElementById("btnGuardarDesdeCalculadora");
if (btnGuardarDesdeCalculadora) {
    btnGuardarDesdeCalculadora.addEventListener("click", () => {
        const seleccionado = obtenerProyectoSeleccionado();
        let nombre = "";

        if (seleccionado) {
            nombre = seleccionado.nombre;
        } else {
            nombre = texto("nombreProyectoCalc");
            if (!nombre) { alert("Escribe un nombre para el proyecto"); return; }
        }

        const { costo, materialesUsados } = calcularCostoActual();

        if (seleccionado) {
            seleccionado.costo = costo;
            seleccionado.materialesUsados = materialesUsados;
            seleccionado.estado = "terminado";
            seleccionado.fechaModificacion = new Date().toISOString();
            guardarProyectos(proyectos);
            renderProyectos();
            alert(`Cálculo guardado en "${seleccionado.nombre}"`);
        } else {
            const nuevo = crearProyecto(nombre, "amigurumi", "");
            nuevo.costo = costo;
            nuevo.materialesUsados = materialesUsados;
            nuevo.estado = "terminado";
            proyectos.unshift(nuevo);
            guardarProyectos(proyectos);
            renderProyectos();
            document.getElementById("nombreProyectoCalc").value = "";
            alert("Proyecto guardado correctamente");
        }
    });
}

// ---------------------------------------------------------------------------
// Inventario
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
        if (valor("invGramosDisponibles") === "" || !Number.isFinite(lana.gramosDisponibles) || lana.gramosDisponibles < 0) {
            errores.push("Los gramos disponibles no pueden ser negativos.");
        }
        if (errores.length) {
            alert("Revisá los datos de la lana:\n\n• " + errores.join("\n• "));
            return;
        }

        const duplicada = inventario.lanas.find(
            (x) =>
                normalizar(x.color) === normalizar(lana.color) &&
                normalizar(x.marca) === normalizar(lana.marca) &&
                x.precioOvillo === lana.precioOvillo &&
                x.gramosOvillo === lana.gramosOvillo
        );
        if (duplicada) {
            if (!confirm(`Ya existe una lana "${lana.color}" (${lana.marca || "sin marca"}) con el mismo precio y gramaje.\n¿Sumar ${lana.gramosDisponibles} g a la existente?`)) {
                return;
            }
            duplicada.gramosDisponibles = Number((duplicada.gramosDisponibles + lana.gramosDisponibles).toFixed(3));
            guardarInventario(inventario);
            renderInventario();
            limpiarCampos(["invColorLana", "invMarcaLana", "invPrecioOvillo", "invGramosOvillo", "invGramosDisponibles"]);
            return;
        }

        inventario = agregarLanaInventario(inventario, lana);
        guardarInventario(inventario);
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
        if (valor("invGramosRellenoTot") === "" || !Number.isFinite(relleno.gramosRelleno) || relleno.gramosRelleno <= 0) {
            errores.push("Los gramos totales deben ser mayores a 0.");
        }
        if (valor("invGramosRellenoDisp") === "" || !Number.isFinite(relleno.gramosDisponibles) || relleno.gramosDisponibles < 0) {
            errores.push("Los gramos disponibles no pueden ser negativos.");
        }
        if (errores.length) {
            alert("Revisá los datos del relleno:\n\n• " + errores.join("\n• "));
            return;
        }

        const duplicado = inventario.rellenos.find(
            (x) =>
                normalizar(x.tipo) === normalizar(relleno.tipo) &&
                normalizar(x.marca) === normalizar(relleno.marca) &&
                x.precioRelleno === relleno.precioRelleno &&
                x.gramosRelleno === relleno.gramosRelleno
        );
        if (duplicado) {
            if (!confirm(`Ya existe un relleno "${relleno.tipo}" (${relleno.marca || "sin marca"}) igual.\n¿Sumar ${relleno.gramosDisponibles} g a la existente?`)) {
                return;
            }
            duplicado.gramosDisponibles = Number((duplicado.gramosDisponibles + relleno.gramosDisponibles).toFixed(3));
            guardarInventario(inventario);
            renderInventario();
            limpiarCampos(["invTipoRelleno", "invMarcaRelleno", "invPrecioRelleno", "invGramosRellenoTot", "invGramosRellenoDisp"]);
            return;
        }

        inventario = agregarRellenoInventario(inventario, relleno);
        guardarInventario(inventario);
        renderInventario();
        limpiarCampos(["invTipoRelleno", "invMarcaRelleno", "invPrecioRelleno", "invGramosRellenoTot", "invGramosRellenoDisp"]);
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
        if (valor("invCantCompradaComp") === "" || !Number.isInteger(comp.cantidadComprada) || comp.cantidadComprada <= 0) {
            errores.push("La cantidad comprada debe ser un número entero mayor a 0.");
        }
        if (valor("invPrecioCompraComp") === "" || !Number.isFinite(comp.precioCompra) || comp.precioCompra <= 0) {
            errores.push("El precio de compra debe ser mayor a 0.");
        }
        if (valor("invCantDispComp") === "" || !Number.isInteger(comp.cantidadDisponible) || comp.cantidadDisponible < 0) {
            errores.push("La cantidad disponible debe ser un número entero (0 o más).");
        } else if (comp.cantidadDisponible > comp.cantidadComprada) {
            errores.push("La cantidad disponible no puede ser mayor a la comprada.");
        }
        if (errores.length) {
            alert("Revisá los datos del componente:\n\n• " + errores.join("\n• "));
            return;
        }

        const duplicado = inventario.componentes.find(
            (x) => normalizar(x.tipo) === normalizar(comp.tipo) && x.precioCompra === comp.precioCompra
        );
        if (duplicado) {
            if (!confirm(`Ya existe un componente "${comp.tipo}" con el mismo precio.\n¿Sumar ${comp.cantidadComprada} comprados y ${comp.cantidadDisponible} disponibles?`)) {
                return;
            }
            duplicado.cantidadComprada += comp.cantidadComprada;
            duplicado.cantidadDisponible += comp.cantidadDisponible;
            guardarInventario(inventario);
            renderInventario();
            limpiarCampos(["invTipoComp", "invCantCompradaComp", "invPrecioCompraComp", "invCantDispComp"]);
            return;
        }

        inventario = agregarComponenteInventario(inventario, comp);
        guardarInventario(inventario);
        renderInventario();
        limpiarCampos(["invTipoComp", "invCantCompradaComp", "invPrecioCompraComp", "invCantDispComp"]);
    });
}

const btnVaciarInventario = document.getElementById("btnVaciarInventario");
if (btnVaciarInventario) {
    btnVaciarInventario.addEventListener("click", () => {
        if (confirm("¿Vaciar todo el inventario? Esta acción no se puede deshacer.")) {
            inventario = { lanas: [], rellenos: [], componentes: [] };
            guardarInventario(inventario);
            renderInventario();
        }
    });
}

const btnExportarInventario = document.getElementById("btnExportarInventario");
if (btnExportarInventario) {
    btnExportarInventario.addEventListener("click", () => {
        descargarJson(`inventario-amigurumis-${Date.now()}.json`, inventario);
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
                inventario = {
                    lanas: Array.isArray(data.lanas) ? data.lanas : [],
                    rellenos: Array.isArray(data.rellenos) ? data.rellenos : [],
                    componentes: Array.isArray(data.componentes) ? data.componentes : [],
                };
                guardarInventario(inventario);
                renderInventario();
                alert("Inventario importado correctamente");
            } catch (err) {
                alert("Archivo JSON inválido");
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}

// ---------------------------------------------------------------------------
// Planificador
// ---------------------------------------------------------------------------
const btnCrearProyecto = document.getElementById("btnCrearProyecto");
if (btnCrearProyecto) {
    btnCrearProyecto.addEventListener("click", () => {
        const nombre = texto("planNombreProyecto");
        if (!nombre) { alert("Escribe un nombre para el proyecto"); return; }

        const nuevo = crearProyecto(nombre, document.getElementById("planTipoProyecto").value, texto("planNotasProyecto"));
        proyectos.unshift(nuevo);
        guardarProyectos(proyectos);

        proyectoActivo = nuevo;
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
        if (!proyectoActivo) { alert("Abrí o creá un proyecto primero"); return; }

        const datos = {
            nombre: texto("planNombreSeccion"),
            puntos: document.getElementById("planPuntosSeccion").value,
            vueltas: document.getElementById("planVueltasSeccion").value,
            altura: document.getElementById("planAlturaSeccion").value,
            notas: texto("planNotasSeccion"),
        };
        if (!datos.nombre) { alert("Escribe un nombre para la sección"); return; }

        agregarSeccion(proyectoActivo, datos);
        guardarProyectos(proyectos);
        renderProyectoActivo();
        renderProyectos();

        ["planNombreSeccion", "planPuntosSeccion", "planVueltasSeccion", "planAlturaSeccion", "planNotasSeccion"].forEach((id) => {
            document.getElementById(id).value = "";
        });
    });
}

const btnCerrarProyectoActivo = document.getElementById("btnCerrarProyectoActivo");
if (btnCerrarProyectoActivo) {
    btnCerrarProyectoActivo.addEventListener("click", () => {
        proyectoActivo = null;
        renderProyectoActivo();
    });
}

const btnGuardarDatosProyecto = document.getElementById("btnGuardarDatosProyecto");
if (btnGuardarDatosProyecto) {
    btnGuardarDatosProyecto.addEventListener("click", () => {
        if (!proyectoActivo) return;

        const nombre = texto("editNombreProyecto");
        if (!nombre) { alert("El nombre del proyecto no puede estar vacío"); return; }

        proyectoActivo.nombre = nombre;
        proyectoActivo.tipo = document.getElementById("editTipoProyecto").value;
        proyectoActivo.notas = texto("editNotasProyecto");
        proyectoActivo.fechaModificacion = new Date().toISOString();

        guardarProyectos(proyectos);
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
        if (!proyectoActivo) return;

        proyectoActivo.fechaModificacion = new Date().toISOString();
        guardarProyectos(proyectos);
        renderProyectos();

        if (confirm(`¿Querés calcular los costos de "${proyectoActivo.nombre}" ahora?`)) {
            seleccionarParaCalcular(proyectoActivo.id);
        } else {
            proyectoActivo = null;
            renderProyectoActivo();
            alert("Proyecto guardado.");
        }
    });
}

function abrirEditorProyecto(id) {
    const p = proyectos.find((x) => x.id === id);
    if (!p) return;
    proyectoActivo = p;
    const aviso = document.getElementById("avisoDatosProyecto");
    if (aviso) aviso.textContent = "";
    renderProyectoActivo();
    const editor = document.getElementById("editorProyecto");
    if (editor) editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleRevisar(id) {
    proyectoRevisadoId = proyectoRevisadoId === id ? null : id;
    renderProyectos();
}

function seleccionarParaCalcular(id) {
    const p = proyectos.find((x) => x.id === id);
    if (!p) return;
    proyectoSeleccionadoId = id;
    renderBannerProyecto();
    irASeccion("calculadora");
    alert(`Proyecto seleccionado: ${p.nombre}\n\nCompletá la calculadora y el coste se guardará en este proyecto.`);
}

function eliminarProyecto(id) {
    const p = proyectos.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`¿Eliminar el proyecto "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

    proyectos = proyectos.filter((x) => x.id !== id);
    if (proyectoActivo && proyectoActivo.id === id) proyectoActivo = null;
    if (proyectoSeleccionadoId === id) proyectoSeleccionadoId = null;
    if (proyectoRevisadoId === id) proyectoRevisadoId = null;

    guardarProyectos(proyectos);
    renderProyectos();
    renderProyectoActivo();
    renderBannerProyecto();
}

// ---------------------------------------------------------------------------
// Patrones
// ---------------------------------------------------------------------------
const btnGuardarPatron = document.getElementById("btnGuardarPatron");
if (btnGuardarPatron) {
    btnGuardarPatron.addEventListener("click", () => {
        const datos = {
            nombre: texto("patronNombre"),
            categoria: texto("patronCategoria"),
            materiales: materialesForm.map((m) => ({ ...m })),
            materialesTexto: texto("patronMateriales"),
            instrucciones: texto("patronInstrucciones"),
        };
        if (!datos.nombre) { alert("Escribe un nombre para el patrón"); return; }

        if (patronEditandoId) {
            const patron = patrones.find((p) => p.id === patronEditandoId);
            if (patron) {
                patron.nombre = datos.nombre;
                patron.categoria = datos.categoria;
                patron.materiales = datos.materiales;
                patron.materialesTexto = datos.materialesTexto;
                patron.instrucciones = datos.instrucciones;
                patron.fechaModificacion = new Date().toISOString();
            }
        } else {
            patrones.push(agregarPatron(datos, generarCodigoPatron(patrones)));
        }

        guardarPatrones(patrones);
        limpiarFormPatron();
        renderPatrones();
    });
}

const btnAgregarMaterialPatron = document.getElementById("btnAgregarMaterialPatron");
if (btnAgregarMaterialPatron) {
    btnAgregarMaterialPatron.addEventListener("click", agregarMaterialPatron);
}

function agregarMaterialPatron() {
    const nombre = texto("patronMatNombre");
    if (!nombre) { alert("Escribe el nombre del material"); return; }

    const cantidad = Number(document.getElementById("patronMatCantidad").value) || 0;
    if (cantidad < 0) { alert("La cantidad no puede ser negativa"); return; }
    const unidad = texto("patronMatUnidad");

    materialesForm.push({ id: generarId(), nombre, cantidad, unidad });
    limpiarCampos(["patronMatNombre", "patronMatCantidad", "patronMatUnidad"]);
    renderMaterialesForm();
    const input = document.getElementById("patronMatNombre");
    if (input) input.focus();
}

function renderMaterialesForm() {
    const cont = document.getElementById("listaMaterialesPatron");
    if (!cont) return;
    cont.innerHTML = "";

    if (!materialesForm.length) {
        cont.innerHTML = "<p class='empty-state'>Sin materiales cargados.</p>";
        return;
    }

    materialesForm.forEach((m) => {
        const cantidad = m.cantidad ? `${m.cantidad}${m.unidad ? " " + m.unidad : ""}` : (m.unidad || "");
        const fila = document.createElement("div");
        fila.className = "material-item";
        fila.innerHTML = `<span class="material-nombre">${escapeHtml(m.nombre)}</span><span class="material-cantidad">${escapeHtml(cantidad)}</span><button type="button" class="btn-danger" data-del-material="${m.id}" title="Quitar">✕</button>`;
        cont.appendChild(fila);
    });

    cont.querySelectorAll("[data-del-material]").forEach((b) => {
        b.addEventListener("click", () => {
            materialesForm = materialesForm.filter((m) => m.id !== b.dataset.delMaterial);
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

    const coincide = (t) => {
        const nt = normalizar(t);
        return !!nt && (nt.includes(n) || n.includes(nt));
    };

    const unidad = normalizar(mat.unidad);
    const esPeso = ["g", "gr", "grs", "gramo", "gramos", "kg"].includes(unidad);
    const esUnidad = ["", "ud", "uds", "unidad", "unidades", "u"].includes(unidad);

    let disponible = 0;
    let hallado = false;

    if (esPeso || esUnidad) {
        inventario.lanas.forEach((l) => {
            if (coincide(l.color) || coincide(l.marca)) { disponible += Number(l.gramosDisponibles) || 0; hallado = true; }
        });
        inventario.rellenos.forEach((r) => {
            if (coincide(r.tipo) || coincide(r.marca)) { disponible += Number(r.gramosDisponibles) || 0; hallado = true; }
        });
    }
    if (esUnidad) {
        inventario.componentes.forEach((c) => {
            if (coincide(c.tipo)) { disponible += Number(c.cantidadDisponible) || 0; hallado = true; }
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
        patronBusqueda = patronBuscador.value;
        renderPatrones();
    });
}

function limpiarFormPatron() {
    limpiarCampos(["patronNombre", "patronCategoria", "patronMateriales", "patronInstrucciones", "patronMatNombre", "patronMatCantidad", "patronMatUnidad"]);
    patronEditandoId = null;
    materialesForm = [];
    renderMaterialesForm();

    const btn = document.getElementById("btnGuardarPatron");
    if (btn) btn.textContent = "Guardar Patrón";

    const cancelar = document.getElementById("btnCancelarEdicionPatron");
    if (cancelar) cancelar.style.display = "none";

    const titulo = document.getElementById("tituloFormPatron");
    if (titulo) titulo.textContent = "Nuevo Patrón";
}

function editarPatron(id) {
    const p = patrones.find((x) => x.id === id);
    if (!p) return;

    patronEditandoId = id;
    document.getElementById("patronNombre").value = p.nombre;
    document.getElementById("patronCategoria").value = p.categoria;
    document.getElementById("patronMateriales").value = p.materialesTexto || "";
    document.getElementById("patronInstrucciones").value = p.instrucciones;

    materialesForm = (p.materiales || []).map((m) => ({ ...m }));
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
    const p = patrones.find((x) => x.id === id);
    if (!p) return;

    const copia = agregarPatron(
        {
            nombre: `${p.nombre} (copia)`,
            categoria: p.categoria,
            materiales: (p.materiales || []).map((m) => ({ ...m })),
            materialesTexto: p.materialesTexto || "",
            instrucciones: p.instrucciones,
        },
        generarCodigoPatron(patrones)
    );
    patrones.push(copia);
    guardarPatrones(patrones);
    renderPatrones();
}

function crearProyectoDesdePatron(id) {
    const p = patrones.find((x) => x.id === id);
    if (!p) return;

    const categoria = normalizar(p.categoria);
    const tipo = categoria.includes("prenda") ? "prenda" : (categoria.includes("amigurumi") ? "amigurumi" : "otro");

    const lineasMateriales = (p.materiales || [])
        .map((m) => `- ${m.nombre}${m.cantidad ? ` (${m.cantidad}${m.unidad ? " " + m.unidad : ""})` : ""}`)
        .join("\n");

    const notas = [
        `Basado en el patrón ${p.codigo} - ${p.nombre}.`,
        lineasMateriales ? `\nMateriales:\n${lineasMateriales}` : "",
        p.materialesTexto ? `\n${p.materialesTexto}` : "",
    ].join("").trim();

    const nuevo = crearProyecto(p.nombre, tipo, notas);
    nuevo.patronOrigen = { id: p.id, codigo: p.codigo, nombre: p.nombre };
    proyectos.unshift(nuevo);
    guardarProyectos(proyectos);
    renderProyectos();

    if (confirm(`Proyecto "${p.nombre}" creado desde el patrón ${p.codigo}.\n\n¿Abrirlo en el Planificador ahora?`)) {
        irASeccion("planificador");
        abrirEditorProyecto(nuevo.id);
    }
}

function toggleRevisarPatron(id) {
    patronRevisadoId = patronRevisadoId === id ? null : id;
    renderPatrones();
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------
function descargarJson(nombreArchivo, datos) {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
}

const btnExportarTodo = document.getElementById("btnExportarTodo");
if (btnExportarTodo) {
    btnExportarTodo.addEventListener("click", () => {
        descargarJson(`backup-amigurumis-${Date.now()}.json`, {
            version: 2,
            inventario,
            patrones,
            proyectos,
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
                    inventario = {
                        lanas: Array.isArray(data.inventario.lanas) ? data.inventario.lanas : [],
                        rellenos: Array.isArray(data.inventario.rellenos) ? data.inventario.rellenos : [],
                        componentes: Array.isArray(data.inventario.componentes) ? data.inventario.componentes : [],
                    };
                }
                if (Array.isArray(data.patrones)) patrones = normalizarPatrones(data.patrones);

                const proyectosImport =
                    data.proyectos ||
                    [].concat(data.proyectosPlan || [], data.proyectosGuardados || []);
                if (Array.isArray(proyectosImport) && proyectosImport.length) {
                    proyectos = proyectosImport.map(normalizarProyecto);
                }

                proyectoActivo = null;
                proyectoSeleccionadoId = null;
                proyectoRevisadoId = null;

                guardarInventario(inventario);
                guardarPatrones(patrones);
                guardarProyectos(proyectos);

                renderAll();
                alert("Backup importado correctamente");
            } catch (err) {
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
function renderInventario() {
    const l = document.getElementById("listaLanasInv");
    const r = document.getElementById("listaRellenosInv");
    const c = document.getElementById("listaComponentesInv");

    if (l) {
        l.innerHTML = "";
        if (!inventario.lanas.length) {
            l.innerHTML = "<p class='empty-state'>Sin lanas</p>";
        } else {
            inventario.lanas.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.color || "Sin color")}</span><span class="item-badges"><span class="badge">${escapeHtml(x.marca || "")}</span></span></div><div class="item-details"><span>Disp: ${escapeHtml(x.gramosDisponibles)}g</span><span>Ovillo: ${escapeHtml(x.gramosOvillo)}g - ${formatearMoneda(x.precioOvillo)}</span></div>`;
                l.appendChild(div);
            });
        }
    }

    if (r) {
        r.innerHTML = "";
        if (!inventario.rellenos.length) {
            r.innerHTML = "<p class='empty-state'>Sin relleno</p>";
        } else {
            inventario.rellenos.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.tipo || "Sin tipo")}</span><span class="item-badges"><span class="badge">${escapeHtml(x.marca || "")}</span></span></div><div class="item-details"><span>Disp: ${escapeHtml(x.gramosDisponibles)}g</span><span>Total: ${escapeHtml(x.gramosRelleno)}g - ${formatearMoneda(x.precioRelleno)}</span></div>`;
                r.appendChild(div);
            });
        }
    }

    if (c) {
        c.innerHTML = "";
        if (!inventario.componentes.length) {
            c.innerHTML = "<p class='empty-state'>Sin componentes</p>";
        } else {
            inventario.componentes.forEach((x) => {
                const div = document.createElement("div");
                div.className = "item-card";
                div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(x.tipo || "Sin tipo")}</span></div><div class="item-details"><span>Disp: ${escapeHtml(x.cantidadDisponible)} ud.</span><span>Comprados: ${escapeHtml(x.cantidadComprada)} ud. - ${formatearMoneda(x.precioCompra)}</span></div>`;
                c.appendChild(div);
            });
        }
    }
}

function renderProyectoActivo() {
    const editor = document.getElementById("editorProyecto");
    if (!editor) return;

    if (!proyectoActivo) {
        editor.style.display = "none";
        return;
    }

    editor.style.display = "block";
    document.getElementById("nombreProyectoActivo").textContent = proyectoActivo.nombre;
    document.getElementById("tipoProyectoActivo").textContent = proyectoActivo.tipo;

    // Datos editables del proyecto
    const editNombre = document.getElementById("editNombreProyecto");
    if (editNombre) editNombre.value = proyectoActivo.nombre;
    const editTipo = document.getElementById("editTipoProyecto");
    if (editTipo) {
        editTipo.value = proyectoActivo.tipo;
        if (editTipo.value !== proyectoActivo.tipo) editTipo.value = "otro";
    }
    const editNotas = document.getElementById("editNotasProyecto");
    if (editNotas) editNotas.value = proyectoActivo.notas || "";

    const lista = document.getElementById("listaSeccionesProyecto");
    if (!lista) return;
    lista.innerHTML = "";

    if (!proyectoActivo.secciones.length) {
        lista.innerHTML = "<p class='empty-state'>Sin secciones añadidas</p>";
        return;
    }

    proyectoActivo.secciones.forEach((s) => {
        const div = document.createElement("div");
        div.className = "seccion-card";
        div.innerHTML = `<div class="seccion-header"><span class="seccion-title">${escapeHtml(s.nombre)}</span><div class="item-actions"><button class="btn-danger" data-del-seccion="${s.id}">Eliminar</button></div></div><div class="seccion-details"><span><strong>Puntos:</strong> ${escapeHtml(s.puntos)}</span><span><strong>Vueltas/Filas:</strong> ${escapeHtml(s.vueltas)}</span><span><strong>Altura:</strong> ${escapeHtml(s.altura)}cm</span></div>${s.notas ? `<div class="seccion-notas">${escapeHtml(s.notas)}</div>` : ""}`;
        lista.appendChild(div);
    });

    lista.querySelectorAll("[data-del-seccion]").forEach((btn) => {
        btn.addEventListener("click", () => {
            eliminarSeccion(proyectoActivo, btn.dataset.delSeccion);
            guardarProyectos(proyectos);
            renderProyectoActivo();
            renderProyectos();
        });
    });
}

function renderDetalleProyecto(p) {
    const costo = p.costo;
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

    const mat = p.materialesUsados;
    const lineas = [];
    if (mat.lana && (mat.lana.color || mat.lana.marca || mat.lana.gramosUsados)) {
        lineas.push(`Lana: ${mat.lana.color || "-"} ${mat.lana.marca || ""} (${mat.lana.gramosUsados || 0} g)`);
    }
    if (mat.relleno && (mat.relleno.tipo || mat.relleno.marca || mat.relleno.gramosUsados)) {
        lineas.push(`Relleno: ${mat.relleno.tipo || "-"} ${mat.relleno.marca || ""} (${mat.relleno.gramosUsados || 0} g)`);
    }
    (mat.componentes || []).forEach((c) => {
        lineas.push(`Componente: ${c.tipo || "-"} (${c.cantidadUtilizada || 0} ud.)`);
    });
    if (lineas.length) {
        html += `<h4>Materiales usados</h4><div class="seccion-notas">${escapeHtml(lineas.join("\n"))}</div>`;
    }

    if (p.secciones.length) {
        html += `<h4>Secciones</h4>`;
        p.secciones.forEach((s) => {
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

function renderProyectos() {
    const lista = document.getElementById("listaProyectos");
    if (!lista) return;
    lista.innerHTML = "";

    if (!proyectos.length) {
        lista.innerHTML = "<p class='empty-state'>Todavía no tenés proyectos. Creá uno arriba.</p>";
        return;
    }

    proyectos.forEach((p) => {
        const terminado = p.estado === "terminado";
        const abierto = proyectoRevisadoId === p.id;

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
                <span>Secciones: ${p.secciones.length}</span>
                <span>Modificado: ${new Date(p.fechaModificacion).toLocaleString("es-AR")}</span>
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

    lista.querySelectorAll("[data-revisar]").forEach((b) => b.addEventListener("click", () => toggleRevisar(b.dataset.revisar)));
    lista.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => abrirEditorProyecto(b.dataset.editar)));
    lista.querySelectorAll("[data-calcular]").forEach((b) => b.addEventListener("click", () => seleccionarParaCalcular(b.dataset.calcular)));
    lista.querySelectorAll("[data-eliminar]").forEach((b) => b.addEventListener("click", () => eliminarProyecto(b.dataset.eliminar)));
}

function renderCategoriasPatrones() {
    const cont = document.getElementById("patronCategorias");
    if (!cont) return;

    const conteo = {};
    patrones.forEach((p) => {
        const cat = (p.categoria || "Sin categoría").trim() || "Sin categoría";
        conteo[cat] = (conteo[cat] || 0) + 1;
    });

    // Si la categoría filtrada ya no existe, volvemos a "Todas".
    if (patronCategoriaFiltro && !Object.prototype.hasOwnProperty.call(conteo, patronCategoriaFiltro)) {
        patronCategoriaFiltro = "";
    }

    cont.innerHTML = "";

    const crearChip = (etiqueta, valor, activo) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip" + (activo ? " active" : "");
        chip.textContent = etiqueta;
        chip.dataset.categoria = valor;
        chip.addEventListener("click", () => {
            patronCategoriaFiltro = valor;
            renderPatrones();
        });
        cont.appendChild(chip);
    };

    crearChip(`Todas (${patrones.length})`, "", patronCategoriaFiltro === "");
    Object.keys(conteo)
        .sort((a, b) => a.localeCompare(b))
        .forEach((cat) => crearChip(`${cat} (${conteo[cat]})`, cat, patronCategoriaFiltro === cat));
}

function renderDetallePatron(p) {
    let html = `<div class="detalle-proyecto">`;
    html += `<div class="item-details">
        <span><strong>Código:</strong> ${escapeHtml(p.codigo)}</span>
        <span><strong>Categoría:</strong> ${escapeHtml(p.categoria || "-")}</span>
        <span><strong>Modificado:</strong> ${new Date(p.fechaModificacion).toLocaleString("es-AR")}</span>
    </div>`;

    html += `<h4>Materiales necesarios</h4>`;
    const materiales = p.materiales || [];
    if (materiales.length) {
        html += `<ul class="lista-materiales-detalle">`;
        materiales.forEach((m) => {
            const disp = calcularDisponibilidadMaterial(m);
            const cant = `${m.cantidad ? `${m.cantidad}` : ""}${m.unidad ? ` ${m.unidad}` : ""}`.trim();
            let estado;
            if (disp.estado === "ok") {
                estado = `<span class="badge-ok">✅ ${disp.disponible}${m.unidad ? " " + m.unidad : ""} en inventario</span>`;
            } else if (disp.estado === "insuficiente") {
                estado = `<span class="badge-pending">⚠️ Solo ${disp.disponible}${m.unidad ? " " + m.unidad : ""} en inventario</span>`;
            } else {
                estado = `<span class="badge-pending">❌ No está en inventario</span>`;
            }
            html += `<li><strong>${escapeHtml(m.nombre)}</strong>${cant ? ` — necesita ${escapeHtml(cant)}` : ""} ${estado}</li>`;
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
        const nombres = materiales.slice(0, 3).map((m) => m.nombre).join(", ");
        const extra = materiales.length > 3 ? `, +${materiales.length - 3} más` : "";
        return `${materiales.length} (${escapeHtml(nombres)}${extra})`;
    }
    if (p.materialesTexto) return escapeHtml(p.materialesTexto.slice(0, 60));
    return "-";
}

function renderPatrones() {
    const lista = document.getElementById("listaPatrones");
    if (!lista) return;

    renderCategoriasPatrones();
    lista.innerHTML = "";

    const busqueda = normalizar(patronBusqueda);
    const filtroCat = normalizar(patronCategoriaFiltro);

    const filtrados = patrones.filter((p) => {
        const cat = normalizar((p.categoria || "Sin categoría").trim() || "Sin categoría");
        const coincideCat = !filtroCat || cat === filtroCat;
        const coincideBusq =
            !busqueda ||
            normalizar(p.nombre).includes(busqueda) ||
            normalizar(p.codigo).includes(busqueda);
        return coincideCat && coincideBusq;
    });

    const resumen = document.getElementById("patronResumen");
    if (resumen) {
        resumen.textContent = patrones.length
            ? `Mostrando ${filtrados.length} de ${patrones.length} patrones.`
            : "Todavía no guardaste patrones.";
    }

    if (!filtrados.length) {
        lista.innerHTML = "<p class='empty-state'>No hay patrones que coincidan con la búsqueda.</p>";
        return;
    }

    filtrados.forEach((p) => {
        const abierto = patronRevisadoId === p.id;
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
                <button type="button" class="btn-danger" data-del-patron="${p.id}">Eliminar</button>
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
    lista.querySelectorAll("[data-del-patron]").forEach((b) => {
        b.addEventListener("click", () => {
            const p = patrones.find((x) => x.id === b.dataset.delPatron);
            if (!p) return;
            if (!confirm(`¿Eliminar el patrón "${p.nombre}" (${p.codigo})?`)) return;

            eliminarPatron(patrones, p.id);
            if (patronRevisadoId === p.id) patronRevisadoId = null;
            if (patronEditandoId === p.id) limpiarFormPatron();
            guardarPatrones(patrones);
            renderPatrones();
        });
    });
}

function renderAll() {
    renderInventario();
    renderProyectoActivo();
    renderProyectos();
    renderPatrones();
    renderMaterialesForm();
    renderBannerProyecto();
    aplicarValorHoraPorDefecto();
}

// Arranque
renderAll();
