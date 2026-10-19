export function calcularLana(precioOvillo, gramosOvillo, gramosUsados) {
    if (precioOvillo <= 0 || gramosOvillo <= 0 || gramosUsados < 0) {
        return 0;
    }

    const valorLana = (precioOvillo / gramosOvillo) * gramosUsados;
    return isNaN(valorLana) || !isFinite(valorLana) ? 0 : valorLana;
}

export function calcularRelleno(precioRelleno, gramosRelleno, rellenoUsado) {
    if (precioRelleno <= 0 || gramosRelleno <= 0 || rellenoUsado < 0) {
        return 0;
    }

    const valorRelleno = (precioRelleno / gramosRelleno) * rellenoUsado;
    return isNaN(valorRelleno) || !isFinite(valorRelleno) ? 0 : valorRelleno;
}

export function calcularManoObra(horasTrabajadas, valorHora) {
    if (horasTrabajadas < 0 || valorHora < 0) {
        return 0;
    }

    const manoObra = horasTrabajadas * valorHora;
    return isNaN(manoObra) || !isFinite(manoObra) ? 0 : manoObra;
}

export function calcularComponente(cantidadComprada, precioCompra, cantidadUtilizada) {
    if (cantidadComprada <= 0 || precioCompra < 0 || cantidadUtilizada < 0) {
        return 0;
    }

    const costoComponente = (precioCompra / cantidadComprada) * cantidadUtilizada;
    return isNaN(costoComponente) || !isFinite(costoComponente) ? 0 : costoComponente;
}

export function calcularTotalComponentes(componentes) {
    return componentes.reduce((total, comp) => {
        const costo = calcularComponente(comp.cantidadComprada, comp.precioCompra, comp.cantidadUtilizada);
        return total + costo;
    }, 0);
}
