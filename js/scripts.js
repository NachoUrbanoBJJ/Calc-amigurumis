import { calcularLana, calcularRelleno, calcularManoObra, calcularComponente, calcularTotalLanasYComponentes } from "./calculos.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";

const componentes = [];

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

if (btnAgregarComponente) {
    btnAgregarComponente.addEventListener("click", agregarComponente);
}

if (btnCalcular) {
    btnCalcular.addEventListener("click", calcularTodo);
}

if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarTodo);
}

function agregarComponente() {
    const tipo = document.getElementById("tipoComponente").value;
    const cantidadComprada = Number(document.getElementById("cantidadComprada").value);
    const precioCompra = Number(document.getElementById("precioCompra").value);
    const cantidadUtilizada = Number(document.getElementById("cantidadUtilizada").value);

    if (!tipo) {
        alert("Selecciona un tipo de componente");
        return;
    }

    if (cantidadComprada <= 0 || isNaN(cantidadComprada)) {
        alert("La cantidad comprada debe ser mayor a 0");
        return;
    }

    if (precioCompra < 0 || isNaN(precioCompra)) {
        alert("El precio de compra no puede ser negativo");
        return;
    }

    if (cantidadUtilizada < 0 || isNaN(cantidadUtilizada)) {
        alert("La cantidad utilizada no puede ser negativa");
        return;
    }

    if (cantidadUtilizada > cantidadComprada) {
        const confirmar = confirm("La cantidad utilizada es mayor a la cantidad comprada. ¿Continuar?");
        if (!confirmar) {
            return;
        }
    }

    componentes.push({
        tipo,
        cantidadComprada,
        precioCompra,
        cantidadUtilizada,
    });

    document.getElementById("cantidadComprada").value = "";
    document.getElementById("precioCompra").value = "";
    document.getElementById("cantidadUtilizada").value = "";

    mostrarListaComponentes(componentes, listaComponentes);
}

function calcularTodo() {
    const precioOvillo = Number(document.getElementById("precioOvillo").value);
    const gramosOvillo = Number(document.getElementById("gramosOvillo").value);
    const gramosUsados = Number(document.getElementById("gramosUsados").value);

    const precioRelleno = Number(document.getElementById("precioRelleno").value);
    const gramosRelleno = Number(document.getElementById("gramosRelleno").value);
    const rellenoUsado = Number(document.getElementById("rellenoUsado").value);

    const horasTrabajadas = Number(document.getElementById("horasTrabajadas").value);
    const valorHora = Number(document.getElementById("valorHoras").value);

    let hayErrores = false;

    if (document.getElementById("precioOvillo").value !== "" && precioOvillo < 0) hayErrores = true;
    if (document.getElementById("gramosOvillo").value !== "" && gramosOvillo <= 0) hayErrores = true;
    if (document.getElementById("gramosUsados").value !== "" && gramosUsados < 0) hayErrores = true;

    if (document.getElementById("precioRelleno").value !== "" && precioRelleno < 0) hayErrores = true;
    if (document.getElementById("gramosRelleno").value !== "" && gramosRelleno <= 0) hayErrores = true;
    if (document.getElementById("rellenoUsado").value !== "" && rellenoUsado < 0) hayErrores = true;

    if (document.getElementById("horasTrabajadas").value !== "" && horasTrabajadas < 0) hayErrores = true;
    if (document.getElementById("valorHoras").value !== "" && valorHora < 0) hayErrores = true;

    if (hayErrores) {
        alert("Revisa los valores introducidos. No se permiten valores negativos o gramos/precio 0 inválidos.");
        return;
    }

    const costoLanas = calcularLana(precioOvillo, gramosOvillo, gramosUsados);
    const costoRelleno = calcularRelleno(precioRelleno, gramosRelleno, rellenoUsado);
    const costoManoObra = calcularManoObra(horasTrabajadas, valorHora);
    const costoComponentes = calcularTotalLanasYComponentes(componentes);

    const totalGeneral = costoLanas + costoRelleno + costoComponentes + costoManoObra;

    document.getElementById("resLanas").textContent = formatearMoneda(costoLanas);
    document.getElementById("resRelleno").textContent = formatearMoneda(costoRelleno);
    document.getElementById("resComponentes").textContent = formatearMoneda(costoComponentes);
    document.getElementById("resManoObra").textContent = formatearMoneda(costoManoObra);
    document.getElementById("resTotal").textContent = formatearMoneda(totalGeneral);

    mostrarDesgloseComponentes(componentes, document.getElementById("desgloseComponentes"));
    mostrarListaComponentes(componentes, listaComponentes);

    resultados.style.display = "block";
    resultados.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function limpiarTodo() {
    document.getElementById("colorLana").value = "";
    document.getElementById("marcaLana").value = "";
    document.getElementById("precioOvillo").value = "";
    document.getElementById("gramosOvillo").value = "";
    document.getElementById("gramosUsados").value = "";

    document.getElementById("tipoRelleno").value = "";
    document.getElementById("marcaRelleno").value = "";
    document.getElementById("precioRelleno").value = "";
    document.getElementById("gramosRelleno").value = "";
    document.getElementById("rellenoUsado").value = "";

    document.getElementById("tipoComponente").value = "";
    document.getElementById("cantidadComprada").value = "";
    document.getElementById("precioCompra").value = "";
    document.getElementById("cantidadUtilizada").value = "";

    document.getElementById("horasTrabajadas").value = "";
    document.getElementById("valorHoras").value = "";

    componentes.length = 0;
    mostrarListaComponentes(componentes, listaComponentes);

    resultados.style.display = "none";

    if (tipoComponente) {
        mostrarComponente(datosComponentes, tipoComponente);
    }
}