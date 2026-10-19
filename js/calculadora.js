import { estado, cargarConfig, guardarConfig, aplicarValorHoraPorDefecto } from "./estado.js";
import { escapeHtml, texto, num, valor } from "./utils.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";
import { calcularLana, calcularRelleno, calcularManoObra, calcularTotalComponentes } from "./calculos.js";
import { descontarLana, descontarRelleno, descontarComponentes, guardarInventario } from "./inventario.js";
import { renderInventario } from "./inventario-ui.js";
import { renderProyectos, renderBannerProyecto, obtenerProyectoSeleccionado } from "./planificador-ui.js";
import { crearProyecto, guardarProyectos } from "./planificador.js";

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

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
function agregarComponente() {
    const tipo = tipoComponente ? tipoComponente.value : "";
    const cantidadComprada = Number(valor("cantidadComprada"));
    const precioCompra = Number(valor("precioCompra"));
    const cantidadUtilizada = Number(valor("cantidadUtilizada"));

    if (!tipo) {
        alert("Seleccioná un tipo de componente.");
        return;
    }
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
    if (cantidadUtilizada > cantidadComprada && !confirm("La cantidad usada es mayor a la comprada. ¿Continuar?"))
        return;

    estado.componentes.push({ tipo, cantidadComprada, precioCompra, cantidadUtilizada });

    document.getElementById("cantidadComprada").value = "";
    document.getElementById("precioCompra").value = "";
    document.getElementById("cantidadUtilizada").value = "";

    mostrarListaComponentes(estado.componentes, listaComponentes);
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------
/**
 * Calcula el costo y arma los materiales usados a partir de la calculadora.
 * Fuente única de verdad para el coste (evita duplicar la fórmula).
 */
function calcularCostoActual() {
    const costo = {
        lanas: calcularLana(num("precioOvillo"), num("gramosOvillo"), num("gramosUsados")),
        relleno: calcularRelleno(num("precioRelleno"), num("gramosRelleno"), num("rellenoUsado")),
        componentes: calcularTotalComponentes(estado.componentes),
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

    mostrarDesgloseComponentes(estado.componentes, document.getElementById("desgloseComponentes"));
    mostrarListaComponentes(estado.componentes, listaComponentes);

    resultados.style.display = "block";
    resultados.scrollIntoView({ behavior: "smooth", block: "nearest" });

    aplicarDescuentoInventario();
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
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    aplicarValorHoraPorDefecto();

    estado.componentes.length = 0;
    mostrarListaComponentes(estado.componentes, listaComponentes);

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

    const antes = JSON.parse(JSON.stringify(estado.inventario));
    const preview = JSON.parse(JSON.stringify(estado.inventario));

    descontarLana(preview, { color: texto("colorLana"), marca: texto("marcaLana"), gramosUsados: num("gramosUsados") });
    descontarRelleno(preview, {
        tipo: texto("tipoRelleno"),
        marca: texto("marcaRelleno"),
        gramosUsados: num("rellenoUsado"),
    });
    descontarComponentes(preview, estado.componentes);

    let gramosLana = 0;
    antes.lanas.forEach((l, i) => {
        gramosLana += l.gramosDisponibles - preview.lanas[i].gramosDisponibles;
    });
    let gramosRelleno = 0;
    antes.rellenos.forEach((r, i) => {
        gramosRelleno += r.gramosDisponibles - preview.rellenos[i].gramosDisponibles;
    });
    let componentesDescontados = 0;
    antes.componentes.forEach((c, i) => {
        componentesDescontados += c.cantidadDisponible - preview.componentes[i].cantidadDisponible;
    });

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

    estado.inventario = preview;
    guardarInventario(estado.inventario);
    renderInventario();
    if (aviso) {
        aviso.textContent =
            "✔️ Stock descontado del inventario → " + detalle.map((d) => d.replace("• ", "")).join(" · ");
    }
}

// ---------------------------------------------------------------------------
// Guardar el cálculo como proyecto (o sobre el proyecto seleccionado)
// ---------------------------------------------------------------------------
const btnGuardarDesdeCalculadora = document.getElementById("btnGuardarDesdeCalculadora");
if (btnGuardarDesdeCalculadora) {
    btnGuardarDesdeCalculadora.addEventListener("click", () => {
        const seleccionado = obtenerProyectoSeleccionado();
        let nombre;

        if (seleccionado) {
            nombre = seleccionado.nombre;
        } else {
            nombre = texto("nombreProyectoCalc");
            if (!nombre) {
                alert("Escribe un nombre para el proyecto");
                return;
            }
        }

        const { costo, materialesUsados } = calcularCostoActual();

        if (seleccionado) {
            seleccionado.costo = costo;
            seleccionado.materialesUsados = materialesUsados;
            seleccionado.estado = "terminado";
            seleccionado.fechaModificacion = new Date().toISOString();
            guardarProyectos(estado.proyectos);
            renderProyectos();
            renderBannerProyecto();
            alert(`Cálculo guardado en "${seleccionado.nombre}"`);
        } else {
            const nuevo = crearProyecto(nombre, "amigurumi", "");
            nuevo.costo = costo;
            nuevo.materialesUsados = materialesUsados;
            nuevo.estado = "terminado";
            estado.proyectos.unshift(nuevo);
            guardarProyectos(estado.proyectos);
            renderProyectos();
            document.getElementById("nombreProyectoCalc").value = "";
            alert("Proyecto guardado correctamente");
        }
    });
}
