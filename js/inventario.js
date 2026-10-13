const STORAGE_KEY_INVENTARIO = "calc-amigurumis-inventario-v1";

export const inventarioVacio = {
    lanas: [],
    rellenos: [],
    componentes: [],
};

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
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
        if (color && l.color.toLowerCase() !== color.toLowerCase()) continue;
        if (marca && l.marca.toLowerCase() !== marca.toLowerCase()) continue;
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
        if (tipo && r.tipo.toLowerCase() !== tipo.toLowerCase()) continue;
        if (marca && r.marca.toLowerCase() !== marca.toLowerCase()) continue;
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
            if (cu.tipo && c.tipo.toLowerCase() !== cu.tipo.toLowerCase()) continue;
            const descontar = Math.min(restante, c.cantidadDisponible);
            c.cantidadDisponible = Math.round(c.cantidadDisponible - descontar);
            restante = Math.round(restante - descontar);
        }
        if (cu.cantidadUtilizada - restante > 0) actualizado = true;
    });
    return { actualizado };
}