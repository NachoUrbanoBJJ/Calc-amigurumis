// ---------------------------------------------------------------------------
// Modales propios: reemplazan alert() y confirm() del navegador.
// - No bloquean la UI con un diálogo nativo no estilable.
// - Devuelven una Promise, así que se usan con await.
// - Si por algún motivo el DOM del modal no existe, vuelven a los nativos.
// ---------------------------------------------------------------------------

function el(id) {
    return document.getElementById(id);
}

let alResolverse = null;
let manejadorTecla = null;

function quitarTeclas() {
    if (manejadorTecla) {
        document.removeEventListener("keydown", manejadorTecla);
        manejadorTecla = null;
    }
}

function cerrar(valor) {
    const cont = el("modalContenedor");
    if (cont) cont.style.display = "none";
    quitarTeclas();
    const resolver = alResolverse;
    alResolverse = null;
    if (resolver) resolver(valor);
}

function abrirDialogo({ mensaje, titulo, okTexto, canceloTexto, permiteCancelar }) {
    return new Promise((resolve) => {
        const cont = el("modalContenedor");
        const tituloEl = el("modalTitulo");
        const mensajeEl = el("modalMensaje");
        const okEl = el("modalAceptar");
        const canceloEl = el("modalCancelar");

        // Fallback: si el modal no está disponible, usamos el navegador.
        if (!cont || !tituloEl || !mensajeEl || !okEl || !canceloEl) {
            if (permiteCancelar) resolve(window.confirm(mensaje));
            else {
                window.alert(mensaje);
                resolve(true);
            }
            return;
        }

        tituloEl.textContent = titulo;
        mensajeEl.textContent = mensaje;
        okEl.textContent = okTexto;
        if (canceloTexto) canceloEl.textContent = canceloTexto;
        canceloEl.style.display = permiteCancelar ? "" : "none";

        // Cerramos antes un diálogo previo (defensa ante doble apertura).
        if (alResolverse) {
            const anterior = alResolverse;
            alResolverse = null;
            anterior(false);
        }

        alResolverse = resolve;
        cont.style.display = "flex";

        okEl.onclick = () => cerrar(true);
        canceloEl.onclick = () => cerrar(false);
        cont.onclick = (e) => {
            if (e.target === cont) cerrar(permiteCancelar ? false : true);
        };

        quitarTeclas();
        manejadorTecla = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                cerrar(true);
            } else if (e.key === "Escape" && permiteCancelar) {
                e.preventDefault();
                cerrar(false);
            }
        };
        document.addEventListener("keydown", manejadorTecla);

        okEl.focus();
    });
}

/**
 * Diálogo de confirmación (Sí / No). Resuelve true si se acepta.
 */
export function confirmar(mensaje, opciones = {}) {
    return abrirDialogo({
        mensaje,
        titulo: opciones.titulo || "Confirmá para continuar",
        okTexto: opciones.ok || "Aceptar",
        canceloTexto: opciones.cancelo || "Cancelar",
        permiteCancelar: true,
    });
}

/**
 * Diálogo informativo de un solo botón. Resuelve al cerrarlo.
 */
export function mostrarAviso(mensaje, opciones = {}) {
    return abrirDialogo({
        mensaje,
        titulo: opciones.titulo || "Aviso",
        okTexto: opciones.ok || "Entendido",
        canceloTexto: "",
        permiteCancelar: false,
    });
}
