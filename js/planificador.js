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
    return { lanas: 0, relleno: 0, componentes: 0, manoObra: 0, total: 0 };
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
        },
        materialesUsados: {
            lana: mat.lana || null,
            relleno: mat.relleno || null,
            componentes: Array.isArray(mat.componentes) ? mat.componentes : [],
        },
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
export function cargarPatrones() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PATRONES);
        const data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
    } catch (e) {
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

export function agregarPatron(datos) {
    return {
        id: generarId(),
        nombre: datos.nombre || "Sin nombre",
        categoria: datos.categoria || "",
        materiales: datos.materiales || "",
        instrucciones: datos.instrucciones || "",
        fecha: new Date().toISOString(),
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
