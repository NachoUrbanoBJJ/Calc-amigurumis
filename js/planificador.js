const STORAGE_KEY_PROYECTOS = "calc-amigurumis-proyectos-v2";
const STORAGE_KEY_PLAN_OLD = "calc-amigurumis-planificador-v1";
const STORAGE_KEY_GUARDADOS_OLD = "calc-amigurumis-proyectos-guardados-v1";
const STORAGE_KEY_PATRONES = "calc-amigurumis-patrones-v2";

export function generarId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function costoVacio() {
    return {
        lanas: 0,
        relleno: 0,
        componentes: 0,
        manoObra: 0,
        total: 0,
        precioVenta: 0,
        ganancia: 0,
        margen: 0,
    };
}

function materialesVacios() {
    return { lana: null, relleno: null, componentes: [] };
}

/**
 * Deja cualquier proyecto (nuevo o viejo) con la forma actual.
 */
export function normalizarProyecto(p) {
    const base = p || {};
    const costo = base.costo || {};
    const mat = base.materialesUsados || {};
    const total = Number(costo.total) || 0;

    return {
        id: base.id || generarId(),
        nombre: base.nombre || "Sin nombre",
        tipo: base.tipo || "amigurumi",
        notas: base.notas || "",
        secciones: Array.isArray(base.secciones) ? base.secciones : [],
        costo: {
            lanas: Number(costo.lanas) || 0,
            relleno: Number(costo.relleno) || 0,
            componentes: Number(costo.componentes) || 0,
            manoObra: Number(costo.manoObra) || 0,
            total,
            precioVenta: Number(costo.precioVenta) || 0,
            ganancia: Number(costo.ganancia) || 0,
            margen: Number(costo.margen) || 0,
        },
        materialesUsados: {
            lana: mat.lana || null,
            relleno: mat.relleno || null,
            componentes: Array.isArray(mat.componentes) ? mat.componentes : [],
        },
        patronOrigen: base.patronOrigen || null,
        estado: base.estado || (total > 0 ? "terminado" : "planificando"),
        fechaCreacion: base.fechaCreacion || base.fecha || new Date().toISOString(),
        fechaModificacion: base.fechaModificacion || base.fecha || new Date().toISOString(),
    };
}

export function cargarProyectos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS);
        if (raw) {
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data.map(normalizarProyecto) : [];
        }
        return migrarProyectosAntiguos();
    } catch (error) {
        console.error("Error al cargar proyectos", error);
        return [];
    }
}

/**
 * Migra los datos de las versiones viejas (planificador + guardados) al modelo unificado.
 */
function migrarProyectosAntiguos() {
    const todos = [];

    try {
        const plan = JSON.parse(localStorage.getItem(STORAGE_KEY_PLAN_OLD) || "[]");
        if (Array.isArray(plan)) {
            plan.forEach((p) => todos.push(normalizarProyecto({ ...p, estado: "planificando" })));
        }
    } catch (e) {
        console.warn("No se pudo migrar proyectos planificados", e);
    }

    try {
        const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY_GUARDADOS_OLD) || "[]");
        if (Array.isArray(guardados)) {
            guardados.forEach((p) => todos.push(normalizarProyecto(p)));
        }
    } catch (e) {
        console.warn("No se pudieron migrar proyectos guardados", e);
    }

    if (todos.length) {
        guardarProyectos(todos);
    }
    return todos;
}

export function guardarProyectos(proyectos) {
    try {
        localStorage.setItem(STORAGE_KEY_PROYECTOS, JSON.stringify(proyectos));
    } catch (error) {
        console.error("Error al guardar proyectos", error);
    }
}

export function crearProyecto(nombre, tipo, notas) {
    const ahora = new Date().toISOString();
    return {
        id: generarId(),
        nombre: nombre || "Proyecto sin nombre",
        tipo: tipo || "amigurumi",
        notas: notas || "",
        secciones: [],
        costo: costoVacio(),
        materialesUsados: materialesVacios(),
        patronOrigen: null,
        estado: "planificando",
        fechaCreacion: ahora,
        fechaModificacion: ahora,
    };
}

export function agregarSeccion(proyecto, datos) {
    const seccion = {
        id: generarId(),
        nombre: datos.nombre || "Sin nombre",
        puntos: Number(datos.puntos) || 0,
        vueltas: Number(datos.vueltas) || 0,
        altura: Number(datos.altura) || 0,
        notas: datos.notas || "",
    };
    proyecto.secciones.push(seccion);
    proyecto.fechaModificacion = new Date().toISOString();
    return seccion;
}

export function eliminarSeccion(proyecto, id) {
    const idx = proyecto.secciones.findIndex((s) => s.id === id);
    if (idx > -1) {
        proyecto.secciones.splice(idx, 1);
        proyecto.fechaModificacion = new Date().toISOString();
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// Patrones
// ---------------------------------------------------------------------------
function codigoNumerico(patron) {
    const m = /^PAT-(\d+)$/.exec((patron && patron.codigo) || "");
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Devuelve el próximo código legible disponible (PAT-0001, PAT-0002, ...).
 */
export function generarCodigoPatron(patrones) {
    let max = 0;
    (patrones || []).forEach((p) => {
        max = Math.max(max, codigoNumerico(p));
    });
    return "PAT-" + String(max + 1).padStart(4, "0");
}

export function normalizarPatron(p) {
    const base = p || {};
    return {
        id: base.id || generarId(),
        codigo: base.codigo || "",
        nombre: base.nombre || "Sin nombre",
        categoria: base.categoria || "",
        materiales: Array.isArray(base.materiales) ? base.materiales.map(normalizarMaterial) : [],
        materialesTexto: typeof base.materiales === "string" ? base.materiales : base.materialesTexto || "",
        instrucciones: base.instrucciones || "",
        fecha: base.fecha || new Date().toISOString(),
        fechaModificacion: base.fechaModificacion || base.fecha || new Date().toISOString(),
    };
}

export function normalizarMaterial(m) {
    const base = m || {};
    return {
        id: base.id || generarId(),
        nombre: base.nombre || "",
        cantidad: Number(base.cantidad) || 0,
        unidad: base.unidad || "",
    };
}

function asignarCodigosFaltantes(normalizados) {
    let max = 0;
    normalizados.forEach((p) => {
        max = Math.max(max, codigoNumerico(p));
    });
    let huboAsignacion = false;
    normalizados.forEach((p) => {
        if (!/^PAT-\d+$/.test(p.codigo)) {
            max += 1;
            p.codigo = "PAT-" + String(max).padStart(4, "0");
            huboAsignacion = true;
        }
    });
    return huboAsignacion;
}

/**
 * Normaliza una lista de patrones (de localStorage o de un backup) y les asigna código si falta.
 */
export function normalizarPatrones(lista) {
    const normalizados = (Array.isArray(lista) ? lista : []).map(normalizarPatron);
    asignarCodigosFaltantes(normalizados);
    return normalizados;
}

export function cargarPatrones() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PATRONES);
        const data = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(data)) return [];

        const normalizados = data.map(normalizarPatron);

        // Persistimos para que los códigos queden estables entre recargas.
        if (asignarCodigosFaltantes(normalizados)) {
            guardarPatrones(normalizados);
        }

        return normalizados;
    } catch (e) {
        console.error("Error al cargar patrones", e);
        return [];
    }
}

export function guardarPatrones(patrones) {
    try {
        localStorage.setItem(STORAGE_KEY_PATRONES, JSON.stringify(patrones));
    } catch (e) {
        console.error("Error al guardar patrones", e);
    }
}

export function agregarPatron(datos, codigo) {
    const ahora = new Date().toISOString();
    return {
        id: generarId(),
        codigo: codigo || datos.codigo || "",
        nombre: datos.nombre || "Sin nombre",
        categoria: datos.categoria || "",
        materiales: Array.isArray(datos.materiales) ? datos.materiales.map(normalizarMaterial) : [],
        materialesTexto: datos.materialesTexto || "",
        instrucciones: datos.instrucciones || "",
        fecha: ahora,
        fechaModificacion: ahora,
    };
}

export function eliminarPatron(patrones, id) {
    const idx = patrones.findIndex((p) => p.id === id);
    if (idx > -1) {
        patrones.splice(idx, 1);
        return true;
    }
    return false;
}
