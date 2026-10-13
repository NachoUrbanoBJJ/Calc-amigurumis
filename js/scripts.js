//Array Componentes
const componentes = [];

function agregarComponentes() {
    const tipo = document.getElementById("tipoComponente").value;
    const cantidadComprada = Number(document.getElementById("cantidadComprada").value);
    const precioCompra = Number(document.getElementById("precioCompra").value);
    const cantidadUtilizada = Number(document.getElementById("cantidadUtilizada").value);

    const componente = {
    tipo: tipo,
    cantidadComprada: cantidadComprada,
    precioCompra: precioCompra,
    cantidadUtilizada: cantidadUtilizada
    }
    componentes.push(componente);
    console.log(componentes);
}

const tipoComponente = document.getElementById("tipoComponente");
const datosComponentes = document.getElementById("datosComponentes")

tipoComponente.addEventListener("change", mostrarComponente);


function mostrarComponente() {
    if (tipoComponente.value === "") {
        datosComponentes.style.display = "none";
    } else  {
        datosComponentes.style.display = "block";
    } 
}
//calculo mano de obra
function valorTrabajo() {
    const horas = Number(document.getElementById("horasTrabajadas").value);
    const valorHora = Number(document.getElementById("valorHoras").value);

    const manoObra = horas * valorHora;
}
//calculo lanas
function valorLanas() {
    const precioOvillo = Number(document.getElementById("precioOvillo").value);
    const gramos = Number(document.getElementById("gramosOvillo").value);
    const gramosUsados = Number(document.getElementById("gramosUsados").value);

    const valorLana = (precioOvillo / gramos) * gramosUsados;
}
//calculo Relleno
function valorRelleno() {
    const precioRelleno = Number(document.getElementById("precioRelleno").value);
    const gramosRelleno = Number(document.getElementById("gramosRelleno").value);
    const rellenoUsado = Number(document.getElementById("rellenoUsado").value);

    const valorDelRelleno = (precioRelleno / gramosRelleno) * rellenoUsado;
    console.log(valorDelRelleno);
}

