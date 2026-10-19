import { leerJson, guardarJson } from "./almacenamiento.js";

// ---------------------------------------------------------------------------
// Configuración persistente de la app.
// Vive en su propio módulo para que utils.js (sección activa) y estado.js
// (valor por hora) puedan usarla sin generar ciclos de imports.
// ---------------------------------------------------------------------------
const STORAGE_KEY_CONFIG = "calc-amigurumis-config-v1";

export function cargarConfig() {
    const config = leerJson(STORAGE_KEY_CONFIG, {});
    return config && typeof config === "object" && !Array.isArray(config) ? config : {};
}

export function guardarConfig(config) {
    return guardarJson(STORAGE_KEY_CONFIG, config);
}

/**
 * Mezcla cambios en la configuración persistente y devuelve el resultado.
 */
export function actualizarConfig(cambios = {}) {
    const config = { ...cargarConfig(), ...cambios };
    guardarConfig(config);
    return config;
}
