import { escapeHtml } from "./utils.js";

export function mostrarComponente(datosComponentes, tipoComponente) {
    if (!datosComponentes || !tipoComponente) return;

    if (tipoComponente.value === "") {
        datosComponentes.style.display = "none";
    } else {
        datosComponentes.style.display = "block";
    }
}

export function formatearMoneda(valor) {
    const numero = Number(valor);
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(numero) ? numero : 0);
}

/**
 * Lista editable de componentes de la calculadora.
 * Cada fila trae botones de Editar / Eliminar; la lógica vive en calculadora.js
 * (acá sólo se renderiza y se marcan con data-comp-idx).
 */
export function mostrarListaComponentes(componentes, elemento) {
    if (!elemento) return;

    if (!componentes || componentes.length === 0) {
        elemento.innerHTML = "<p class='empty-state'>No hay componentes agregados</p>";
        return;
    }

    let html = "";
    componentes.forEach((comp, index) => {
        const costo = (comp.precioCompra / comp.cantidadComprada) * comp.cantidadUtilizada;
        const costoFormateado = isNaN(costo) || !isFinite(costo) ? formatearMoneda(0) : formatearMoneda(costo);
        html += `
            <div class="componente-item">
                <div class="comp-header">${index + 1}. ${escapeHtml(comp.tipo || "Sin tipo")}</div>
                <div class="comp-details">
                    Comprado: ${escapeHtml(comp.cantidadComprada)} ud. | Precio compra: ${formatearMoneda(comp.precioCompra)} | 
                    Usado: ${escapeHtml(comp.cantidadUtilizada)} ud. | Costo: ${costoFormateado}
                </div>
                <div class="item-actions">
                    <button type="button" class="btn-secundario" data-comp-idx="${index}" data-comp-accion="editar">Editar</button>
                    <button type="button" class="btn-danger" data-comp-idx="${index}" data-comp-accion="eliminar">Eliminar</button>
                </div>
            </div>
        `;
    });
    elemento.innerHTML = html;
}

export function mostrarDesgloseComponentes(componentes, elemento) {
    if (!elemento) return;

    if (!componentes || componentes.length === 0) {
        elemento.innerHTML = "<p style='color: #666; font-style: italic;'>Sin componentes</p>";
        return;
    }

    let html = "";
    componentes.forEach((comp) => {
        const costo = (comp.precioCompra / comp.cantidadComprada) * comp.cantidadUtilizada;
        const costoFormateado = isNaN(costo) || !isFinite(costo) ? formatearMoneda(0) : formatearMoneda(costo);
        html += `
            <div class="componente-item">
                <div class="comp-header">${escapeHtml(comp.tipo || "Sin tipo")}</div>
                <div class="comp-details">
                    Cantidad usada: ${escapeHtml(comp.cantidadUtilizada)} ud. | Costo atribuible: ${costoFormateado}
                </div>
            </div>
        `;
    });
    elemento.innerHTML = html;
}
