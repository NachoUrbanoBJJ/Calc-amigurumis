import { leerJson, guardarJson } from "./almacenamiento.js";
import { esObjeto } from "./utils.js";

const STORAGE_KEY_INVENTARIO = "calc-amigurumis-inventario-v1";

export const inventarioVacio = {
    lanas: [],
    rellenos: [],
    componentes: [],
};

function generarId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function normalizarTexto(valor) {
    return String(valor == null ? "" : valor)
        .trim()
        .toLowerCase();
}

/**
 * Compara dos textos de forma tolerante: iguales o uno contenido en el otro.
 * Sirve para que "ojos" coincida con "Ojos de seguridad 12mm" y para que la
 * disponibilidad de un patrón use el mismo criterio que el descuento de stock.
 */
export function coincideTexto(a, b) {
    const na = normalizarTexto(a);
    const nb = normalizarTexto(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Deja cualquier estructura de inventario (localStorage o backup) con la forma
 * actual, descartando elementos que no sean objetos.
 * Garantiza que cada material tenga `id` (necesario para editar/eliminar).
 */
export function normalizarInventario(data) {
    const base = esObjeto(data) ? data : {};
    const conId = (lista) =>
        Array.isArray(lista) ? lista.filter(esObjeto).map((x) => ({ ...x, id: x.id || generarId() })) : [];
    return {
        lanas: conId(base.lanas),
        rellenos: conId(base.rellenos),
        componentes: conId(base.componentes),
    };
}

export function cargarInventario() {
    const data = leerJson(STORAGE_KEY_INVENTARIO, null);
    return normalizarInventario(data);
}
export function guardarInventario(inventario) {
    return guardarJson(STORAGE_KEY_INVENTARIO, inventario);
}

const UMBRAL_STOCK_BAJO = 0.1; // 10 % de la referencia

/**
 * Clasifica el stock de un material.
 * `referencia` es el gramaje de un ovillo (lana), el total del paquete
 * (relleno) o la cantidad comprada (componente).
 * Devuelve null cuando hay stock suficiente.
 */
export function clasificarStock(disponible, referencia) {
    const disp = Number(disponible) || 0;
    const ref = Number(referencia) || 0;

    if (disp <= 0) return { clase: "badge-agotado", texto: "Sin stock" };
    if (ref > 0 && disp <= ref * UMBRAL_STOCK_BAJO) return { clase: "badge-bajo", texto: "Stock bajo" };
    return null;
}

export function agregarLanaInventario(inventario, lana) {
    inventario.lanas.push({
        id: generarId(),
        color: lana.color || "",
        marca: lana.marca || "",
        precioOvillo: Number(lana.precioOvillo) || 0,
        gramosOvillo: Number(lana.gramosOvillo) || 0,
        gramosDisponibles: Number(lana.gramosDisponibles) || 0,
        fecha: new Date().toISOString(),
    });
    return inventario;
}

export function agregarRellenoInventario(inventario, relleno) {
    inventario.rellenos.push({
        id: generarId(),
        tipo: relleno.tipo || "",
        marca: relleno.marca || "",
        precioRelleno: Number(relleno.precioRelleno) || 0,
        gramosRelleno: Number(relleno.gramosRelleno) || 0,
        gramosDisponibles: Number(relleno.gramosDisponibles) || 0,
        fecha: new Date().toISOString(),
    });
    return inventario;
}

export function agregarComponenteInventario(inventario, componente) {
    inventario.componentes.push({
        id: generarId(),
        tipo: componente.tipo || "",
        cantidadComprada: Number(componente.cantidadComprada) || 0,
        precioCompra: Number(componente.precioCompra) || 0,
        cantidadDisponible: Number(componente.cantidadDisponible) || 0,
        fecha: new Date().toISOString(),
    });
    return inventario;
}

/**
 * Descuenta gramos de lana del inventario.
 * Coincidencia tolerante por color y marca (igual criterio que la
 * disponibilidad de materiales de los patrones).
 */
export function descontarLana(inventario, { color, marca, gramosUsados } = {}) {
    const lanas = Array.isArray(inventario && inventario.lanas) ? inventario.lanas : [];
    if (!gramosUsados || gramosUsados <= 0) return { descontado: 0, actualizado: false };

    let restante = gramosUsados;
    for (let i = 0; i < lanas.length && restante > 0; i++) {
        const l = lanas[i];
        if (!l || !(l.gramosDisponibles > 0)) continue;
        if (color && !coincideTexto(color, l.color)) continue;
        if (marca && !coincideTexto(marca, l.marca)) continue;
        const descontar = Math.min(restante, l.gramosDisponibles);
        l.gramosDisponibles = Number((l.gramosDisponibles - descontar).toFixed(3));
        restante = Number((restante - descontar).toFixed(3));
    }

    const descontado = Number((gramosUsados - restante).toFixed(3));
    return { descontado, actualizado: descontado > 0 };
}

/**
 * Descuenta gramos de relleno del inventario (coincidencia tolerante).
 */
export function descontarRelleno(inventario, { tipo, marca, gramosUsados } = {}) {
    const rellenos = Array.isArray(inventario && inventario.rellenos) ? inventario.rellenos : [];
    if (!gramosUsados || gramosUsados <= 0) return { descontado: 0, actualizado: false };

    let restante = gramosUsados;
    for (let i = 0; i < rellenos.length && restante > 0; i++) {
        const r = rellenos[i];
        if (!r || !(r.gramosDisponibles > 0)) continue;
        if (tipo && !coincideTexto(tipo, r.tipo)) continue;
        if (marca && !coincideTexto(marca, r.marca)) continue;
        const descontar = Math.min(restante, r.gramosDisponibles);
        r.gramosDisponibles = Number((r.gramosDisponibles - descontar).toFixed(3));
        restante = Number((restante - descontar).toFixed(3));
    }

    const descontado = Number((gramosUsados - restante).toFixed(3));
    return { descontado, actualizado: descontado > 0 };
}

export function descontarComponentes(inventario, componentesUsados = []) {
    const componentes = Array.isArray(inventario && inventario.componentes) ? inventario.componentes : [];
    let actualizado = false;
    componentesUsados.forEach((cu) => {
        if (!cu || !cu.cantidadUtilizada || cu.cantidadUtilizada <= 0) return;
        let restante = cu.cantidadUtilizada;
        for (let i = 0; i < componentes.length && restante > 0; i++) {
            const c = componentes[i];
            if (!c || !(c.cantidadDisponible > 0)) continue;
            // Coincidencia tolerante: "ojos" matchea con "Ojos de seguridad 12mm"
            if (cu.tipo && !coincideTexto(cu.tipo, c.tipo)) continue;
            const descontar = Math.min(restante, c.cantidadDisponible);
            c.cantidadDisponible = Math.round(c.cantidadDisponible - descontar);
            restante = Math.round(restante - descontar);
        }
        if (cu.cantidadUtilizada - restante > 0) actualizado = true;
    });
    return { actualizado };
}
