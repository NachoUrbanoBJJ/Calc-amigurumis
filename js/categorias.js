import { leerJson, guardarJson } from "./almacenamiento.js";
import { esObjeto } from "./utils.js";
import { normalizarTexto } from "./inventario.js";

// ---------------------------------------------------------------------------
// Categorías de componentes (las que aparecen en la calculadora).
// Se guardan aparte del inventario para que el usuario pueda administrarlas.
// ---------------------------------------------------------------------------
const CLAVE_CATEGORIAS = "calc-amigurumis-categorias-componentes-v1";

export const CATEGORIAS_COMPONENTES_POR_DEFECTO = ["Ojos", "Piedras", "Cinta", "Botones", "Llavero"];

/**
 * Deja una lista de categorías limpia: sin vacíos, sin repetidas (comparando
 * sin distinguir mayúsculas) y recortando espacios.
 */
export function normalizarListaCategorias(lista) {
    const vistas = new Set();
    const salida = [];

    (Array.isArray(lista) ? lista : []).forEach((item) => {
        const nombre = typeof item === "string" ? item.trim() : "";
        if (!nombre) return;
        const clave = normalizarTexto(nombre);
        if (vistas.has(clave)) return;
        vistas.add(clave);
        salida.push(nombre);
    });

    return salida;
}

/**
 * Acepta el formato actual (array) o uno viejo ({ componentes: [...] }).
 * Si el dato no es reconocible devuelve las categorías por defecto.
 */
export function normalizarCategorias(data) {
    const lista = Array.isArray(data)
        ? data
        : esObjeto(data) && Array.isArray(data.componentes)
          ? data.componentes
          : null;

    if (!lista) return [...CATEGORIAS_COMPONENTES_POR_DEFECTO];
    return normalizarListaCategorias(lista);
}

export function cargarCategorias() {
    const data = leerJson(CLAVE_CATEGORIAS, null);
    return data === null ? [...CATEGORIAS_COMPONENTES_POR_DEFECTO] : normalizarCategorias(data);
}

export function guardarCategorias(lista) {
    return guardarJson(CLAVE_CATEGORIAS, normalizarListaCategorias(lista));
}

function validarNombre(lista, nombre, indiceIgnorado = -1) {
    const limpio = typeof nombre === "string" ? nombre.trim() : "";
    if (!limpio) return { ok: false, error: "Escribí un nombre para la categoría." };

    const repetida = lista.some(
        (categoria, indice) => indice !== indiceIgnorado && normalizarTexto(categoria) === normalizarTexto(limpio)
    );
    if (repetida) return { ok: false, error: `La categoría "${limpio}" ya existe.` };

    return { ok: true, nombre: limpio };
}

/**
 * Agrega una categoría al final. Devuelve { ok, lista, error }.
 */
export function agregarCategoria(lista, nombre) {
    const actuales = Array.isArray(lista) ? lista.slice() : [];
    const validacion = validarNombre(actuales, nombre);
    if (!validacion.ok) return { ok: false, lista: actuales, error: validacion.error };

    return { ok: true, lista: [...actuales, validacion.nombre] };
}

/**
 * Renombra la categoría en `indice`. Permite guardar el mismo nombre sin
 * marcarlo como duplicado.
 */
export function renombrarCategoria(lista, indice, nombre) {
    const actuales = Array.isArray(lista) ? lista.slice() : [];
    if (!Number.isInteger(indice) || indice < 0 || indice >= actuales.length) {
        return { ok: false, lista: actuales, error: "No se encontró la categoría." };
    }

    const validacion = validarNombre(actuales, nombre, indice);
    if (!validacion.ok) return { ok: false, lista: actuales, error: validacion.error };

    actuales[indice] = validacion.nombre;
    return { ok: true, lista: actuales };
}

export function eliminarCategoria(lista, indice) {
    return (Array.isArray(lista) ? lista : []).filter((_, i) => i !== indice);
}
