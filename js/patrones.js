const STORAGE_KEY_PATRONES = "calc-amigurumis-patrones-v1";

export function cargarPatrones() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PATRONES);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error al cargar patrones", error);
        return [];
    }
}

export function guardarPatrones(patrones) {
    try {
        localStorage.setItem(STORAGE_KEY_PATRONES, JSON.stringify(patrones));
    } catch (error) {
        console.error("Error al guardar patrones", error);
    }
}

export function agregarPatron(patrones, patron) {
    const nuevoPatron = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        nombre: patron.nombre || "Sin nombre",
        categoria: patron.categoria || "",
        descripcion: patron.descripcion || "",
        materiales: patron.materiales || [],
        instrucciones: patron.instrucciones || "",
        fecha: new Date().toISOString(),
    };
    patrones.push(nuevoPatron);
    return nuevoPatron;
}

export function eliminarPatron(patrones, id) {
    const index = patrones.findIndex((p) => p.id === id);
    if (index !== -1) {
        patrones.splice(index, 1);
        return true;
    }
    return false;
}