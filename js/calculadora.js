import { estado, cargarConfig, guardarConfig, aplicarValorHoraPorDefecto } from "./estado.js";
import { escapeHtml, texto, num, valor } from "./utils.js";
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

const btnCancelarEdicionComponenteCalc = document.getElementById("btnCancelarEdicionComponenteCalc");
if (btnCancelarEdicionComponenteCalc) {
    btnCancelarEdicionComponenteCalc.addEventListener("click", () => cancelarEdicionComponente());
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
    ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = comp[id];
    });
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
    const cantidadComprada = Number(valor("cantidadComprada"));
    const precioCompra = Number(valor("precioCompra"));
    const cantidadUtilizada = Number(valor("cantidadUtilizada"));

    if (!tipo) {
        await mostrarAviso("Seleccioná un tipo de componente.");
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

    const nuevo = { tipo, cantidadComprada, precioCompra, cantidadUtilizada };

    if (editandoComponenteIdx !== null) {
        if (estado.componentes[editandoComponenteIdx]) estado.componentes[editandoComponenteIdx] = nuevo;
        cancelarEdicionComponente();
    } else {
        estado.componentes.push(nuevo);
        ["cantidadComprada", "precioCompra", "cantidadUtilizada"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
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
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

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

// Firma del último cálculo que descontó stock: evita descontar dos veces si se
// aprieta "Calcular" repetidamente sin cambiar los datos.
let firmaDescontada = null;

function firmaCalculo() {
    return JSON.stringify({
        lana: [texto("colorLana"), texto("marcaLana"), num("gramosUsados")],
        relleno: [texto("tipoRelleno"), texto("marcaRelleno"), num("rellenoUsado")],
        componentes: estado.componentes.map((c) => [c.tipo, c.cantidadUtilizada]),
    });
}

/**
 * Descuenta stock del inventario (al presionar Calcular, con confirmación).
 * Si no hay material coincidente: calcula pero no actualiza el inventario.
 * Si el mismo cálculo ya se descontó, no lo vuelve a hacer.
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

    if (!(await confirmar("¿Descontar del inventario?\n\n" + detalle.join("\n"), { titulo: "Confirmar descuento" }))) {
        if (aviso) aviso.textContent = "ℹ️ No se descontó stock (cancelado).";
        return;
    }

    estado.inventario = preview;
    const guardado = guardarInventario(estado.inventario);
    renderInventario();
    if (aviso) {
        let mensaje = guardado
            ? "✔️ Stock descontado del inventario → " + detalle.map((d) => d.replace("• ", "")).join(" · ")
            : "⚠️ Stock descontado, pero no se pudo guardar en el dispositivo. Exportá un backup.";

        // Avisamos lo que no alcanzó en el stock.
        const faltantes = [];
        const difLana = Number((num("gramosUsados") - gramosLana).toFixed(3));
        const difRelleno = Number((num("rellenoUsado") - gramosRelleno).toFixed(3));
        const pedidos = estado.componentes.reduce((suma, c) => suma + (c.cantidadUtilizada || 0), 0);
        const difComp = pedidos - componentesDescontados;

        if (difLana > 0.001) faltantes.push(`Lana: faltaban ${difLana} g`);
        if (difRelleno > 0.001) faltantes.push(`Relleno: faltaban ${difRelleno} g`);
        if (difComp > 0) faltantes.push(`Componentes: faltaban ${difComp} ud.`);

        if (faltantes.length) mensaje += " · ⚠️ Stock insuficiente → " + faltantes.join(", ");

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

        if (seleccionado) {
            seleccionado.costo = costo;
            seleccionado.materialesUsados = materialesUsados;
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
            nuevo.estado = "terminado";
            estado.proyectos.unshift(nuevo);
            guardarProyectos(estado.proyectos);
            renderProyectos();
            document.getElementById("nombreProyectoCalc").value = "";
            await mostrarAviso("Proyecto guardado correctamente.", { titulo: "Guardado" });
        }
    });
}
