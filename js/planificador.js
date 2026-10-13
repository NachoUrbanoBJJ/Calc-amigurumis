const STORAGE_KEY_PROYECTOS_PLAN = "calc-amigurumis-planificador-v1";
const STORAGE_KEY_PATRONES_NEW = "calc-amigurumis-patrones-v2";
const STORAGE_KEY_PROYECTOS_GUARDADOS = "calc-amigurumis-proyectos-guardados-v1";

export function cargarProyectosPlan() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS_PLAN);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function guardarProyectosPlan(proyectos) {
    try {
        localStorage.setItem(STORAGE_KEY_PROYECTOS_PLAN, JSON.stringify(proyectos));
    } catch (e) {
        console.error("Error guardando proyectos plan", e);
    }
}

export function crearProyecto(nombre, tipo, notas) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        nombre: nombre || "Sin nombre",
        tipo: tipo || "amigurumi",
        notas: notas || "",
        secciones: [],
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
    };
}

export function agregarSeccion(proyecto, datos) {
    const seccion = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
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
    const idx = proyecto.secciones.findIndex(s => s.id === id);
    if (idx > -1) {
        proyecto.secciones.splice(idx, 1);
        proyecto.fechaModificacion = new Date().toISOString();
        return true;
    }
    return false;
}

export function cargarPatrones() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PATRONES_NEW);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function guardarPatrones(patrones) {
    try {
        localStorage.setItem(STORAGE_KEY_PATRONES_NEW, JSON.stringify(patrones));
    } catch (e) {
        console.error("Error guardando patrones", e);
    }
}

export function agregarPatron(datos) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        nombre: datos.nombre || "Sin nombre",
        categoria: datos.categoria || "",
        materiales: datos.materiales || "",
        instrucciones: datos.instrucciones || "",
        fecha: new Date().toISOString(),
    };
}

export function eliminarPatron(patrones, id) {
    const idx = patrones.findIndex(p => p.id === id);
    if (idx > -1) {
        patrones.splice(idx, 1);
        return true;
    }
    return false;
}

export function cargarProyectosGuardados() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS_GUARDADOS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

export function guardarProyectosGuardados(proyectos) {
    try {
        localStorage.setItem(STORAGE_KEY_PROYECTOS_GUARDADOS, JSON.stringify(proyectos));
    } catch (e) {
        console.error("Error guardando proyectos", e);
    }
}

export function guardarProyectoCalculado(datos) {
    const proyecto = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        nombre: datos.nombre || "Proyecto sin nombre",
        tipo: datos.tipo || "calculado",
        notas: datos.notas || "",
        costo: datos.costo || { lanas: 0, relleno: 0, componentes: 0, manoObra: 0, total: 0 },
        materialesUsados: datos.materialesUsados || { lana: null, relleno: null, componentes: [] },
        descuentoStockAplicado: false,
        secciones: datos.secciones || [],
        fecha: new Date().toISOString(),
    };
    return proyecto;
}