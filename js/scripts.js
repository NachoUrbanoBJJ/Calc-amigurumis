import { calcularLana, calcularRelleno, calcularManoObra, calcularTotalComponentes } from "./calculos.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";
import {
    cargarProyectos,
    guardarProyectos,
    crearProyecto,
    normalizarProyecto,
    agregarSeccion,
    eliminarSeccion,
    cargarPatrones,
    guardarPatrones,
    agregarPatron,
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
let inventario = cargarInventario();

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
        "horasTrabajadas", "valorHoras", "nombreProyectoCalc"
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

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
            materiales: texto("patronMateriales"),
            instrucciones: texto("patronInstrucciones"),
        };
        if (!datos.nombre) { alert("Escribe un nombre para el patrón"); return; }

        patrones.push(agregarPatron(datos));
        guardarPatrones(patrones);
        renderPatrones();
        ["patronNombre", "patronCategoria", "patronMateriales", "patronInstrucciones"].forEach((id) => {
            document.getElementById(id).value = "";
        });
    });
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
                if (Array.isArray(data.patrones)) patrones = data.patrones;

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

function renderPatrones() {
    const lista = document.getElementById("listaPatrones");
    if (!lista) return;
    lista.innerHTML = "";

    if (!patrones.length) {
        lista.innerHTML = "<p class='empty-state'>Sin patrones guardados</p>";
        return;
    }

    patrones.forEach((p) => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `<div class="item-header"><span class="item-title">${escapeHtml(p.nombre)}</span><span class="item-badges"><span class="badge">${escapeHtml(p.categoria || "")}</span></span></div><div class="item-details"><span><strong>Materiales:</strong> ${escapeHtml(p.materiales || "")}</span></div>${p.instrucciones ? `<div class="seccion-notas"><strong>Instrucciones:</strong><br>${escapeHtml(p.instrucciones)}</div>` : ""}<div class="item-actions"><button class="btn-danger" data-del-patron="${p.id}">Eliminar</button></div>`;
        lista.appendChild(div);
    });

    lista.querySelectorAll("[data-del-patron]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar este patrón?")) {
                eliminarPatron(patrones, btn.dataset.delPatron);
                guardarPatrones(patrones);
                renderPatrones();
            }
        });
    });
}

function renderAll() {
    renderInventario();
    renderProyectoActivo();
    renderProyectos();
    renderPatrones();
    renderBannerProyecto();
}

// Arranque
renderAll();
