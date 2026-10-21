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
 * Descuenta gramos de una lana puntual del inventario, identificada por id.
 * No busca por color/marca: la selección del usuario es la única fuente de
 * verdad (evita descontar el material equivocado).
 *
 * Devuelve cuánto se descontó y cuánto había disponible antes del descuento.
 */
export function descontarLanaPorId(inventario, { inventarioId, gramosUsados } = {}) {
    const lanas = Array.isArray(inventario && inventario.lanas) ? inventario.lanas : [];
    const pedido = Number(gramosUsados) || 0;
    if (!inventarioId || pedido <= 0) {
        return { descontado: 0, actualizado: false, encontrado: false, disponible: 0 };
    }

    const lana = lanas.find((l) => l && l.id === inventarioId);
    if (!lana) return { descontado: 0, actualizado: false, encontrado: false, disponible: 0 };

    const disponible = Math.max(0, Number(lana.gramosDisponibles) || 0);
    const descontar = Math.min(pedido, disponible);
    lana.gramosDisponibles = Number((disponible - descontar).toFixed(3));

    return {
        descontado: Number(descontar.toFixed(3)),
        actualizado: descontar > 0,
        encontrado: true,
        disponible,
    };
}

/**
 * Descuenta gramos de un relleno puntual del inventario, identificado por id.
 */
export function descontarRellenoPorId(inventario, { inventarioId, gramosUsados } = {}) {
    const rellenos = Array.isArray(inventario && inventario.rellenos) ? inventario.rellenos : [];
    const pedido = Number(gramosUsados) || 0;
    if (!inventarioId || pedido <= 0) {
        return { descontado: 0, actualizado: false, encontrado: false, disponible: 0 };
    }

    const relleno = rellenos.find((r) => r && r.id === inventarioId);
    if (!relleno) return { descontado: 0, actualizado: false, encontrado: false, disponible: 0 };

    const disponible = Math.max(0, Number(relleno.gramosDisponibles) || 0);
    const descontar = Math.min(pedido, disponible);
    relleno.gramosDisponibles = Number((disponible - descontar).toFixed(3));

    return {
        descontado: Number(descontar.toFixed(3)),
        actualizado: descontar > 0,
        encontrado: true,
        disponible,
    };
}

/**
 * Descuenta componentes usados que estén vinculados a un material del
 * inventario por id. Los componentes manuales (sin `inventarioId`) no tocan
 * el stock.
 */
export function descontarComponentes(inventario, componentesUsados = []) {
    const componentes = Array.isArray(inventario && inventario.componentes) ? inventario.componentes : [];
    const detalle = [];

    (Array.isArray(componentesUsados) ? componentesUsados : []).forEach((cu) => {
        if (!cu || !cu.inventarioId) return;
        const pedido = Number(cu.cantidadUtilizada) || 0;
        if (pedido <= 0) return;

        const componente = componentes.find((c) => c && c.id === cu.inventarioId);
        if (!componente) {
            detalle.push({ inventarioId: cu.inventarioId, encontrado: false, pedido, descontado: 0, disponible: 0 });
            return;
        }

        const disponible = Math.max(0, Number(componente.cantidadDisponible) || 0);
        const descontar = Math.min(pedido, disponible);
        componente.cantidadDisponible = Math.round(disponible - descontar);

        detalle.push({
            inventarioId: cu.inventarioId,
            encontrado: true,
            pedido,
            descontado: descontar,
            disponible,
        });
    });

    return { actualizado: detalle.some((d) => d.descontado > 0), detalle };
}
