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

function normalizarTexto(valor) {
    return String(valor == null ? "" : valor)
        .trim()
        .toLowerCase();
}

/**
 * Compara dos textos de forma tolerante: iguales o uno contenido en el otro.
 * Sirve para que "ojos" coincida con "Ojos de seguridad 12mm".
 */
function coincideTexto(a, b) {
    const na = normalizarTexto(a);
    const nb = normalizarTexto(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
}

export function cargarInventario() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_INVENTARIO);
        if (!raw) return JSON.parse(JSON.stringify(inventarioVacio));
        const data = JSON.parse(raw);
        return {
            lanas: Array.isArray(data.lanas) ? data.lanas : [],
            rellenos: Array.isArray(data.rellenos) ? data.rellenos : [],
            componentes: Array.isArray(data.componentes) ? data.componentes : [],
        };
    } catch (error) {
        console.error("Error al cargar inventario", error);
        return JSON.parse(JSON.stringify(inventarioVacio));
    }
}

export function guardarInventario(inventario) {
    try {
        localStorage.setItem(STORAGE_KEY_INVENTARIO, JSON.stringify(inventario));
    } catch (error) {
        console.error("Error al guardar inventario", error);
    }
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

export function descontarLana(inventario, { color, marca, gramosUsados }) {
    if (!gramosUsados || gramosUsados <= 0) return { descontado: 0, actualizado: false };
    let restante = gramosUsados;
    for (let i = 0; i < inventario.lanas.length && restante > 0; i++) {
        const l = inventario.lanas[i];
        if (l.gramosDisponibles <= 0) continue;
        if (color && normalizarTexto(l.color) !== normalizarTexto(color)) continue;
        if (marca && normalizarTexto(l.marca) !== normalizarTexto(marca)) continue;
        const descontar = Math.min(restante, l.gramosDisponibles);
        l.gramosDisponibles = Number((l.gramosDisponibles - descontar).toFixed(3));
        restante = Number((restante - descontar).toFixed(3));
    }
    return { descontado: Number((gramosUsados - restante).toFixed(3)), actualizado: gramosUsados - restante > 0 };
}

export function descontarRelleno(inventario, { tipo, marca, gramosUsados }) {
    if (!gramosUsados || gramosUsados <= 0) return { descontado: 0, actualizado: false };
    let restante = gramosUsados;
    for (let i = 0; i < inventario.rellenos.length && restante > 0; i++) {
        const r = inventario.rellenos[i];
        if (r.gramosDisponibles <= 0) continue;
        if (tipo && normalizarTexto(r.tipo) !== normalizarTexto(tipo)) continue;
        if (marca && normalizarTexto(r.marca) !== normalizarTexto(marca)) continue;
        const descontar = Math.min(restante, r.gramosDisponibles);
        r.gramosDisponibles = Number((r.gramosDisponibles - descontar).toFixed(3));
        restante = Number((restante - descontar).toFixed(3));
    }
    return { descontado: Number((gramosUsados - restante).toFixed(3)), actualizado: gramosUsados - restante > 0 };
}

export function descontarComponentes(inventario, componentesUsados = []) {
    let actualizado = false;
    componentesUsados.forEach((cu) => {
        if (!cu.cantidadUtilizada || cu.cantidadUtilizada <= 0) return;
        let restante = cu.cantidadUtilizada;
        for (let i = 0; i < inventario.componentes.length && restante > 0; i++) {
            const c = inventario.componentes[i];
            if (c.cantidadDisponible <= 0) continue;
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
