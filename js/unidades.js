// ---------------------------------------------------------------------------
// Unidades de los materiales de patrones.
// Normalizamos los alias más comunes a códigos estables (g, kg, ud, m, cm, ml)
// y sabemos qué magnitudes se pueden comparar con el inventario.
// ---------------------------------------------------------------------------

const ALIAS = new Map([
    ["g", "g"],
    ["gr", "g"],
    ["grs", "g"],
    ["gramo", "g"],
    ["gramos", "g"],
    ["kg", "kg"],
    ["kilo", "kg"],
    ["kilos", "kg"],
    ["kilogramo", "kg"],
    ["kilogramos", "kg"],
    ["ud", "ud"],
    ["uds", "ud"],
    ["u", "ud"],
    ["unidad", "ud"],
    ["unidades", "ud"],
    ["m", "m"],
    ["metro", "m"],
    ["metros", "m"],
    ["cm", "cm"],
    ["centimetro", "cm"],
    ["centímetro", "cm"],
    ["centimetros", "cm"],
    ["centímetros", "cm"],
    ["mm", "mm"],
    ["milimetro", "mm"],
    ["milímetro", "mm"],
    ["milimetros", "mm"],
    ["milímetros", "mm"],
    ["ml", "ml"],
    ["mililitro", "ml"],
    ["mililitros", "ml"],
    ["l", "l"],
    ["litro", "l"],
    ["litros", "l"],
]);

const CATEGORIA = {
    g: "peso",
    kg: "peso",
    ud: "cantidad",
    m: "longitud",
    cm: "longitud",
    mm: "longitud",
    ml: "volumen",
    l: "volumen",
};

const FACTORES = {
    peso: { g: 1, kg: 1000 },
    cantidad: { ud: 1 },
    longitud: { mm: 0.1, cm: 1, m: 100 },
    volumen: { ml: 1, l: 1000 },
};

/**
 * Devuelve el código canónico de una unidad (o el texto en minúsculas si no
 * la reconocemos). Una unidad vacía se conserva vacía.
 */
export function normalizarUnidad(valor) {
    const unidad = String(valor == null ? "" : valor)
        .trim()
        .toLowerCase();
    if (!unidad) return "";
    return ALIAS.get(unidad) || unidad;
}

/**
 * Magnitud de una unidad. Sin unidad se asume "cantidad" (unidades), que es
 * el caso más común en patrones ("6 ojos", "4 botones").
 */
export function categoriaUnidad(unidad) {
    const normalizada = normalizarUnidad(unidad);
    if (!normalizada) return "cantidad";
    return CATEGORIA[normalizada] || "otra";
}

/**
 * Convierte una cantidad entre unidades de la misma magnitud.
 * Devuelve null si las unidades no son compatibles o no se reconocen.
 */
export function convertirUnidad(cantidad, desde, hacia) {
    const origen = normalizarUnidad(desde);
    const destino = normalizarUnidad(hacia);
    const catOrigen = categoriaUnidad(origen);
    const catDestino = categoriaUnidad(destino);

    if (!origen || !destino || catOrigen === "otra" || catOrigen !== catDestino) return null;

    const factores = FACTORES[catOrigen];
    if (!factores || !Object.prototype.hasOwnProperty.call(factores, origen)) return null;
    if (!Object.prototype.hasOwnProperty.call(factores, destino)) return null;

    const numero = Number(cantidad);
    if (!Number.isFinite(numero)) return null;
    return (numero * factores[origen]) / factores[destino];
}

/**
 * Texto corto para mostrar una cantidad con su unidad (sin decimales de más).
 */
export function formatearCantidadUnidad(cantidad, unidad) {
    const numero = Number(cantidad);
    const textoNumero = Number.isFinite(numero)
        ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(numero)
        : "0";
    const normalizada = normalizarUnidad(unidad);
    return normalizada ? `${textoNumero} ${normalizada}` : textoNumero;
}
