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

// Margen que se usa para sugerir un precio de venta cuando el usuario todavía
// no definió el suyo. Es una referencia (costo + 50 %), no un valor obligatorio.
export const MARGEN_IDEAL_POR_DEFECTO = 50;

function redondear2(valor) {
    return Number((Number(valor) || 0).toFixed(2));
}

/**
 * Precio ideal sugerido: costo total + un margen (50 % por defecto).
 * Sirve como referencia aunque el usuario no cargue margen ni precio manual.
 */
export function calcularPrecioIdeal(total, margen = MARGEN_IDEAL_POR_DEFECTO) {
    const costo = Number(total) || 0;
    if (costo <= 0) return 0;

    const margenNum = Number(margen);
    const margenValido = Number.isFinite(margenNum) && margenNum >= 0 ? margenNum : MARGEN_IDEAL_POR_DEFECTO;
    return redondear2(costo * (1 + margenValido / 100));
}

/**
 * Resuelve el precio de venta final.
 * Prioridad: precio manual > margen > sin precio (0).
 * `precioManual` y `margen` aceptan null/"" para indicar "no cargado".
 */
export function calcularVenta(total, precioManual, margen) {
    const costo = Number(total) || 0;
    const manual =
        precioManual === null || precioManual === undefined || precioManual === "" ? null : Number(precioManual);
    const margenNum = margen === null || margen === undefined || margen === "" ? null : Number(margen);

    let precio = 0;
    if (manual !== null && Number.isFinite(manual) && manual > 0) {
        precio = manual;
    } else if (margenNum !== null && Number.isFinite(margenNum) && margenNum >= 0) {
        precio = costo * (1 + margenNum / 100);
    }

    if (!(precio > 0)) {
        return { precioVenta: 0, ganancia: 0, margen: 0 };
    }

    const ganancia = precio - costo;
    return {
        precioVenta: redondear2(precio),
        ganancia: redondear2(ganancia),
        margen: costo > 0 ? redondear2((ganancia / costo) * 100) : 0,
    };
}

export function calcularComponente(cantidadComprada, precioCompra, cantidadUtilizada) {
    if (cantidadComprada <= 0 || precioCompra < 0 || cantidadUtilizada < 0) {
        return 0;
    }

    const costoComponente = (precioCompra / cantidadComprada) * cantidadUtilizada;
    return isNaN(costoComponente) || !isFinite(costoComponente) ? 0 : costoComponente;
}

export function calcularTotalComponentes(componentes = []) {
    if (!Array.isArray(componentes)) return 0;
    return componentes.reduce((total, comp) => {
        if (!comp) return total;
        const costo = calcularComponente(comp.cantidadComprada, comp.precioCompra, comp.cantidadUtilizada);
        return total + costo;
    }, 0);
}

// ---------------------------------------------------------------------------
// Escalado por tamaño
// ---------------------------------------------------------------------------
// Un amigurumi (o una prenda) que se teje más grande no usa material de forma
// lineal: la lana crece con la superficie (~altura²), el relleno con el volumen
// (~altura²·³, un poco más que la lana) y las horas con la cantidad de puntos y
// vueltas (~altura^1,7). Estos exponentes son aproximaciones empíricas estables
// para piezas tejidas del mismo modelo.
export const EXPONENTE_LANA = 2;
export const EXPONENTE_RELLENO = 2.3;
export const EXPONENTE_HORAS = 1.7;

/**
 * Factor de escala entre dos tamaños: (destino / base) elevado a un exponente.
 * Devuelve 1 si algún tamaño no es un número positivo (escala neutra).
 */
export function factorEscala(tamanoBase, tamanoDestino, exponente = EXPONENTE_LANA) {
    const base = Number(tamanoBase);
    const destino = Number(tamanoDestino);

    if (!Number.isFinite(base) || !Number.isFinite(destino) || base <= 0 || destino <= 0) {
        return 1;
    }

    const exp = Number.isFinite(Number(exponente)) ? Number(exponente) : EXPONENTE_LANA;
    return Math.pow(destino / base, exp);
}

/**
 * Escala un conjunto de valores desde un tamaño base a un tamaño destino.
 * `valores` usa las claves { gramosLana, gramosRelleno, horas }.
 * Devuelve los valores escalados y los factores aplicados a cada uno.
 */
export function escalarPorTamano(tamanoBase, tamanoDestino, valores = {}) {
    const fLana = factorEscala(tamanoBase, tamanoDestino, EXPONENTE_LANA);
    const fRelleno = factorEscala(tamanoBase, tamanoDestino, EXPONENTE_RELLENO);
    const fHoras = factorEscala(tamanoBase, tamanoDestino, EXPONENTE_HORAS);

    const gramosLana = (Number(valores.gramosLana) || 0) * fLana;
    const gramosRelleno = (Number(valores.gramosRelleno) || 0) * fRelleno;
    const horas = (Number(valores.horas) || 0) * fHoras;

    return {
        gramosLana: redondear2(gramosLana),
        gramosRelleno: redondear2(gramosRelleno),
        horas: redondear2(horas),
        factores: { lana: redondear2(fLana), relleno: redondear2(fRelleno), horas: redondear2(fHoras) },
    };
}
