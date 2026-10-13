const STORAGE_KEY_PROYECTOS = "calc-amigurumis-proyectos-v1";

export function cargarProyectos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error al cargar proyectos", error);
        return [];
    }
}

export function guardarProyectos(proyectos) {
    try {
        localStorage.setItem(STORAGE_KEY_PROYECTOS, JSON.stringify(proyectos));
    } catch (error) {
        console.error("Error al guardar proyectos", error);
    }
}

export function guardarProyecto(proyectos, proyecto) {
    const nuevoProyecto = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        nombre: proyecto.nombre || "Proyecto sin nombre",
        patronId: proyecto.patronId || null,
        notas: proyecto.notas || "",
        fecha: new Date().toISOString(),
        costo: {
            lanas: Number(proyecto.costo?.lanas) || 0,
            relleno: Number(proyecto.costo?.relleno) || 0,
            componentes: Number(proyecto.costo?.componentes) || 0,
            manoObra: Number(proyecto.costo?.manoObra) || 0,
            total: Number(proyecto.costo?.total) || 0,
        },
        materialesUsados: {
            lana: proyecto.materialesUsados?.lana || null,
            relleno: proyecto.materialesUsados?.relleno || null,
            componentes: Array.isArray(proyecto.materialesUsados?.componentes)
                ? proyecto.materialesUsados.componentes
                : [],
        },
        descuentoStockAplicado: Boolean(proyecto.descuentoStockAplicado),
    };
    proyectos.push(nuevoProyecto);
    return nuevoProyecto;
}