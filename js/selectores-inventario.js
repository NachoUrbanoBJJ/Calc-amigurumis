import { estado } from "./estado.js";
import { coincideTexto } from "./inventario.js";
import { formatearCantidadUnidad } from "./unidades.js";

// ---------------------------------------------------------------------------
// Selectores de materiales del inventario usados por la calculadora.
// La selección se guarda por id: el descuento de stock nunca depende del texto
// que el usuario escribió en color/marca/tipo.
// ---------------------------------------------------------------------------

const SELECT_LANA = "lanaInventarioId";
const SELECT_RELLENO = "rellenoInventarioId";
const SELECT_COMPONENTE = "componenteInventarioId";

const INFO_DEFAULT = {
    lana: "Elegí una lana para descontar ese ovillo exacto al calcular.",
    relleno: "Elegí un relleno para descontar ese paquete exacto al calcular.",
    componente: "Elegí un componente para descontar unidades exactas al calcular.",
};

function lanas() {
    return Array.isArray(estado.inventario?.lanas) ? estado.inventario.lanas : [];
}
function rellenos() {
    return Array.isArray(estado.inventario?.rellenos) ? estado.inventario.rellenos : [];
}
function componentes() {
    return Array.isArray(estado.inventario?.componentes) ? estado.inventario.componentes : [];
}

function crearOpcion(valor, texto) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = texto;
    return opcion;
}

function repoblar(select, opciones, textoVacio) {
    if (!select) return;
    const seleccionado = select.value;

    select.replaceChildren();
    select.appendChild(crearOpcion("", textoVacio));
    opciones.forEach(({ valor, texto }) => select.appendChild(crearOpcion(valor, texto)));

    const sigueExistiendo = opciones.some((o) => o.valor === seleccionado);
    select.value = sigueExistiendo ? seleccionado : "";
    select.disabled = opciones.length === 0;
}

export function obtenerLanaPorId(id) {
    return lanas().find((l) => l.id === id) || null;
}

export function obtenerRellenoPorId(id) {
    return rellenos().find((r) => r.id === id) || null;
}

export function obtenerComponentePorId(id) {
    return componentes().find((c) => c.id === id) || null;
}

export function etiquetaLana(lana) {
    if (!lana) return "";
    return `${lana.color || "Sin color"}${lana.marca ? ` — ${lana.marca}` : ""}`;
}

export function etiquetaRelleno(relleno) {
    if (!relleno) return "";
    return `${relleno.tipo || "Sin tipo"}${relleno.marca ? ` — ${relleno.marca}` : ""}`;
}

export function etiquetaComponente(componente) {
    return componente?.tipo || "Sin tipo";
}

export function categoriaSugeridaComponente(componente) {
    if (!componente) return "";
    return (estado.categorias || []).find((cat) => coincideTexto(cat, componente.tipo)) || "";
}

/**
 * Vuelve a dibujar las opciones conservando la selección actual (por id).
 * No completa los campos de la calculadora: eso sólo pasa cuando el usuario
 * elige un material explícitamente.
 */
export function renderSelectoresInventario() {
    repoblar(
        document.getElementById(SELECT_LANA),
        lanas().map((l) => ({
            valor: l.id,
            texto: `${etiquetaLana(l)} — ${l.gramosDisponibles || 0} g disponibles`,
        })),
        "Sin vincular (no descuenta stock)"
    );

    repoblar(
        document.getElementById(SELECT_RELLENO),
        rellenos().map((r) => ({
            valor: r.id,
            texto: `${etiquetaRelleno(r)} — ${r.gramosDisponibles || 0} g disponibles`,
        })),
        "Sin vincular (no descuenta stock)"
    );

    repoblar(
        document.getElementById(SELECT_COMPONENTE),
        componentes().map((c) => ({
            valor: c.id,
            texto: `${etiquetaComponente(c)} — ${c.cantidadDisponible || 0} ud. disponibles`,
        })),
        "Sin vincular (no descuenta stock)"
    );

    actualizarInfoSelectores();
}

/**
 * Actualiza el texto de ayuda debajo de cada selector según lo elegido.
 * Se llama al cambiar el inventario y al restaurar una snapshot de proyecto.
 */
export function actualizarInfoSelectores() {
    const infoLana = document.getElementById("lanaInventarioInfo");
    if (infoLana) {
        const id = document.getElementById(SELECT_LANA)?.value || "";
        const lana = obtenerLanaPorId(id);
        infoLana.textContent = !id
            ? INFO_DEFAULT.lana
            : lana
              ? `Disponible: ${formatearCantidadUnidad(lana.gramosDisponibles, "g")} (ovillo de ${formatearCantidadUnidad(lana.gramosOvillo, "g")}).`
              : "⚠️ La lana elegida ya no está en el inventario.";
    }

    const infoRelleno = document.getElementById("rellenoInventarioInfo");
    if (infoRelleno) {
        const id = document.getElementById(SELECT_RELLENO)?.value || "";
        const relleno = obtenerRellenoPorId(id);
        infoRelleno.textContent = !id
            ? INFO_DEFAULT.relleno
            : relleno
              ? `Disponible: ${formatearCantidadUnidad(relleno.gramosDisponibles, "g")} (paquete de ${formatearCantidadUnidad(relleno.gramosRelleno, "g")}).`
              : "⚠️ El relleno elegido ya no está en el inventario.";
    }

    const infoComponente = document.getElementById("componenteInventarioInfo");
    if (infoComponente) {
        const id = document.getElementById(SELECT_COMPONENTE)?.value || "";
        const componente = obtenerComponentePorId(id);
        infoComponente.textContent = !id
            ? INFO_DEFAULT.componente
            : componente
              ? `Disponible: ${formatearCantidadUnidad(componente.cantidadDisponible, "ud")} de ${formatearCantidadUnidad(componente.cantidadComprada, "ud")} compradas.`
              : "⚠️ El componente elegido ya no está en el inventario.";
    }
}
