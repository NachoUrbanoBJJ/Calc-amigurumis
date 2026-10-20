import { escapeHtml, formatearFecha } from "./utils.js";
import { formatearMoneda } from "./ui.js";

// ---------------------------------------------------------------------------
// Exportaciones de proyectos y patrones (sin dependencias externas).
// - CSV compatible con Excel (separador ";" y BOM UTF-8).
// - PDF mediante la vista de impresión del navegador.
// - PNG generado con Canvas (resumen prolijo).
// ---------------------------------------------------------------------------

const SEPARADOR_CSV = ";";
const SALTO = "\r\n";

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export function escaparCampoCSV(valor, separador = SEPARADOR_CSV) {
    const texto = valor == null ? "" : String(valor);
    const necesitaComillas =
        texto.includes(separador) || texto.includes('"') || texto.includes("\n") || texto.includes("\r");
    return necesitaComillas ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function filaCSV(...campos) {
    return campos.map((campo) => escaparCampoCSV(campo)).join(SEPARADOR_CSV) + SALTO;
}

/**
 * Número con coma decimal, sin separador de miles: Excel en español lo
 * interpreta como número y no como texto.
 */
function numeroCSV(valor) {
    return (Number(valor) || 0).toFixed(2).replace(".", ",");
}

function filaVacia() {
    return SALTO;
}

function nombreEstado(estado) {
    return estado === "terminado" ? "Terminado" : "Planificando";
}

function lineasMateriales(proyecto) {
    const mat = proyecto.materialesUsados || {};
    const filas = [];

    if (mat.lana && (mat.lana.color || mat.lana.marca || mat.lana.gramosUsados)) {
        const detalle = [mat.lana.color, mat.lana.marca].filter(Boolean).join(" ");
        filas.push(filaCSV("Lana", detalle || "-", `${Number(mat.lana.gramosUsados) || 0} g`));
    }
    if (mat.relleno && (mat.relleno.tipo || mat.relleno.marca || mat.relleno.gramosUsados)) {
        const detalle = [mat.relleno.tipo, mat.relleno.marca].filter(Boolean).join(" ");
        filas.push(filaCSV("Relleno", detalle || "-", `${Number(mat.relleno.gramosUsados) || 0} g`));
    }
    (mat.componentes || []).forEach((c) => {
        filas.push(filaCSV("Componente", c.tipo || "-", `${Number(c.cantidadUtilizada) || 0} ud.`));
    });

    return filas;
}

export function proyectoACSV(proyecto) {
    const p = proyecto || {};
    const costo = p.costo || {};
    const lineas = [];

    lineas.push(filaCSV("Campo", "Valor"));
    lineas.push(filaCSV("Nombre", p.nombre || "Sin nombre"));
    lineas.push(filaCSV("Tipo", p.tipo || "amigurumi"));
    lineas.push(filaCSV("Estado", nombreEstado(p.estado)));
    lineas.push(filaCSV("Creado", formatearFecha(p.fechaCreacion)));
    lineas.push(filaCSV("Modificado", formatearFecha(p.fechaModificacion)));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Costos", "Importe (ARS)"));
    lineas.push(filaCSV("Lanas", numeroCSV(costo.lanas)));
    lineas.push(filaCSV("Relleno", numeroCSV(costo.relleno)));
    lineas.push(filaCSV("Componentes", numeroCSV(costo.componentes)));
    lineas.push(filaCSV("Mano de obra", numeroCSV(costo.manoObra)));
    lineas.push(filaCSV("Total", numeroCSV(costo.total)));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Venta", "Importe (ARS)"));
    lineas.push(filaCSV("Precio ideal (+50 %)", numeroCSV(costo.precioIdeal)));
    lineas.push(filaCSV("Precio de venta", numeroCSV(costo.precioVenta)));
    lineas.push(filaCSV("Ganancia", numeroCSV(costo.ganancia)));
    lineas.push(filaCSV("Margen (%)", numeroCSV(costo.margen)));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Material usado", "Detalle", "Cantidad"));
    const materiales = lineasMateriales(p);
    if (materiales.length) lineas.push(...materiales);
    else lineas.push(filaCSV("Sin materiales registrados", "", ""));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Sección", "Puntos", "Vueltas", "Altura (cm)", "Notas"));
    const secciones = Array.isArray(p.secciones) ? p.secciones : [];
    if (secciones.length) {
        secciones.forEach((s) => {
            lineas.push(filaCSV(s.nombre || "Sin nombre", s.puntos || 0, s.vueltas || 0, s.altura || 0, s.notas || ""));
        });
    } else {
        lineas.push(filaCSV("Sin secciones", "", "", "", ""));
    }
    lineas.push(filaVacia());

    lineas.push(filaCSV("Notas"));
    lineas.push(filaCSV(p.notas || ""));

    return lineas.join("");
}

export function patronACSV(patron) {
    const p = patron || {};
    const lineas = [];

    lineas.push(filaCSV("Campo", "Valor"));
    lineas.push(filaCSV("Código", p.codigo || ""));
    lineas.push(filaCSV("Nombre", p.nombre || "Sin nombre"));
    lineas.push(filaCSV("Categoría", p.categoria || ""));
    lineas.push(filaCSV("Creado", formatearFecha(p.fecha)));
    lineas.push(filaCSV("Modificado", formatearFecha(p.fechaModificacion)));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Material", "Cantidad", "Unidad"));
    const materiales = Array.isArray(p.materiales) ? p.materiales : [];
    if (materiales.length) {
        materiales.forEach((m) => lineas.push(filaCSV(m.nombre || "-", m.cantidad || 0, m.unidad || "")));
    } else {
        lineas.push(filaCSV("Sin materiales cargados", "", ""));
    }
    lineas.push(filaVacia());

    lineas.push(filaCSV("Materiales (notas)"));
    lineas.push(filaCSV(p.materialesTexto || ""));
    lineas.push(filaVacia());

    lineas.push(filaCSV("Instrucciones"));
    lineas.push(filaCSV(p.instrucciones || ""));

    return lineas.join("");
}

export function nombreArchivoSeguro(nombre) {
    const limpio = String(nombre == null ? "" : nombre)
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
    return limpio || "documento";
}

function descargarTexto(nombreArchivo, contenido, mime) {
    if (typeof document === "undefined") return;
    const blob = new Blob([contenido], { type: mime });
    descargarBlob(nombreArchivo, blob);
}

function descargarBlob(nombreArchivo, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function descargarProyectoCSV(proyecto) {
    const nombre = nombreArchivoSeguro(`proyecto-${proyecto && proyecto.nombre}`);
    descargarTexto(`${nombre}.csv`, "\uFEFF" + proyectoACSV(proyecto), "text/csv;charset=utf-8");
}

export function descargarPatronCSV(patron) {
    const nombre = nombreArchivoSeguro(`patron-${patron && (patron.codigo || patron.nombre)}`);
    descargarTexto(`${nombre}.csv`, "\uFEFF" + patronACSV(patron), "text/csv;charset=utf-8");
}

// ---------------------------------------------------------------------------
// PDF (vista de impresión)
// ---------------------------------------------------------------------------
function tablaImpresion(filas) {
    return `<table class="impreso-tabla">${filas
        .map(
            ([etiqueta, valor]) =>
                `<tr><th>${escapeHtml(etiqueta)}</th><td>${escapeHtml(valor == null ? "" : valor)}</td></tr>`
        )
        .join("")}</table>`;
}

function htmlProyecto(proyecto) {
    const p = proyecto || {};
    const costo = p.costo || {};
    const mat = p.materialesUsados || {};
    const materiales = [];

    if (mat.lana && (mat.lana.color || mat.lana.marca || mat.lana.gramosUsados)) {
        materiales.push(
            `<li><strong>Lana:</strong> ${escapeHtml([mat.lana.color, mat.lana.marca].filter(Boolean).join(" ") || "-")} — ${Number(mat.lana.gramosUsados) || 0} g</li>`
        );
    }
    if (mat.relleno && (mat.relleno.tipo || mat.relleno.marca || mat.relleno.gramosUsados)) {
        materiales.push(
            `<li><strong>Relleno:</strong> ${escapeHtml([mat.relleno.tipo, mat.relleno.marca].filter(Boolean).join(" ") || "-")} — ${Number(mat.relleno.gramosUsados) || 0} g</li>`
        );
    }
    (mat.componentes || []).forEach((c) => {
        materiales.push(
            `<li><strong>Componente:</strong> ${escapeHtml(c.tipo || "-")} — ${Number(c.cantidadUtilizada) || 0} ud.</li>`
        );
    });

    const secciones = Array.isArray(p.secciones) ? p.secciones : [];

    return `
        <article class="impreso">
            <header class="impreso-header">
                <p class="impreso-kicker">Calculadora de Amigurumis</p>
                <h1>${escapeHtml(p.nombre || "Sin nombre")}</h1>
                <p>${escapeHtml(p.tipo || "amigurumi")} · ${escapeHtml(nombreEstado(p.estado))}</p>
                <p class="impreso-muted">Creado: ${escapeHtml(formatearFecha(p.fechaCreacion))} · Modificado: ${escapeHtml(formatearFecha(p.fechaModificacion))}</p>
            </header>

            <section>
                <h2>Costos</h2>
                ${tablaImpresion([
                    ["Lanas", formatearMoneda(costo.lanas)],
                    ["Relleno", formatearMoneda(costo.relleno)],
                    ["Componentes", formatearMoneda(costo.componentes)],
                    ["Mano de obra", formatearMoneda(costo.manoObra)],
                    ["Total general", formatearMoneda(costo.total)],
                ])}
            </section>

            <section>
                <h2>Precio de venta</h2>
                ${tablaImpresion([
                    ["Precio ideal (+50 %)", formatearMoneda(costo.precioIdeal)],
                    ["Precio de venta", costo.precioVenta > 0 ? formatearMoneda(costo.precioVenta) : "Sin definir"],
                    ["Ganancia", costo.precioVenta > 0 ? formatearMoneda(costo.ganancia) : "—"],
                    ["Margen", costo.precioVenta > 0 ? `${(Number(costo.margen) || 0).toFixed(1)} %` : "—"],
                ])}
            </section>

            <section>
                <h2>Materiales usados</h2>
                ${materiales.length ? `<ul>${materiales.join("")}</ul>` : `<p class="impreso-muted">Sin materiales registrados.</p>`}
            </section>

            <section>
                <h2>Secciones</h2>
                ${
                    secciones.length
                        ? `<table class="impreso-tabla impreso-tabla-amplia">
                            <thead><tr><th>Sección</th><th>Puntos</th><th>Vueltas</th><th>Altura</th></tr></thead>
                            <tbody>${secciones
                                .map(
                                    (s) =>
                                        `<tr><td>${escapeHtml(s.nombre || "Sin nombre")}</td><td>${escapeHtml(s.puntos)}</td><td>${escapeHtml(s.vueltas)}</td><td>${escapeHtml(s.altura)} cm</td></tr>`
                                )
                                .join("")}</tbody>
                        </table>
                        ${secciones
                            .filter((s) => s.notas)
                            .map(
                                (s) =>
                                    `<p class="impreso-nota"><strong>${escapeHtml(s.nombre)}:</strong> ${escapeHtml(s.notas)}</p>`
                            )
                            .join("")}`
                        : `<p class="impreso-muted">Sin secciones.</p>`
                }
            </section>

            <section>
                <h2>Notas</h2>
                <p class="impreso-notas">${escapeHtml(p.notas || "Sin notas.")}</p>
            </section>
        </article>
    `;
}

function htmlPatron(patron) {
    const p = patron || {};
    const materiales = Array.isArray(p.materiales) ? p.materiales : [];

    return `
        <article class="impreso">
            <header class="impreso-header">
                <p class="impreso-kicker">Calculadora de Amigurumis</p>
                <h1>${escapeHtml(p.nombre || "Sin nombre")}</h1>
                <p>${escapeHtml(p.codigo || "")} · ${escapeHtml(p.categoria || "Sin categoría")}</p>
                <p class="impreso-muted">Modificado: ${escapeHtml(formatearFecha(p.fechaModificacion))}</p>
            </header>

            <section>
                <h2>Materiales necesarios</h2>
                ${
                    materiales.length
                        ? `<table class="impreso-tabla impreso-tabla-amplia">
                            <thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead>
                            <tbody>${materiales
                                .map(
                                    (m) =>
                                        `<tr><td>${escapeHtml(m.nombre || "-")}</td><td>${escapeHtml(m.cantidad || 0)}</td><td>${escapeHtml(m.unidad || "")}</td></tr>`
                                )
                                .join("")}</tbody>
                        </table>`
                        : `<p class="impreso-muted">Sin materiales cargados.</p>`
                }
            </section>

            ${
                p.materialesTexto
                    ? `<section><h2>Materiales (notas)</h2><p class="impreso-notas">${escapeHtml(p.materialesTexto)}</p></section>`
                    : ""
            }

            <section>
                <h2>Instrucciones</h2>
                <p class="impreso-notas">${escapeHtml(p.instrucciones || "Sin instrucciones.")}</p>
            </section>
        </article>
    `;
}

function imprimirDocumento(html) {
    if (typeof document === "undefined") return;

    let contenedor = document.getElementById("zonaImpresion");
    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "zonaImpresion";
        document.body.appendChild(contenedor);
    }
    contenedor.innerHTML = html;

    const limpiar = () => {
        document.body.classList.remove("imprimiendo");
        window.removeEventListener("afterprint", limpiar);
        const actual = document.getElementById("zonaImpresion");
        if (actual) actual.remove();
    };

    document.body.classList.add("imprimiendo");
    window.addEventListener("afterprint", limpiar, { once: true });

    try {
        window.print();
    } catch {
        limpiar();
        return;
    }

    // Respaldo por si el navegador no dispara "afterprint" (móviles viejos).
    setTimeout(limpiar, 60000);
}

export function imprimirProyecto(proyecto) {
    imprimirDocumento(htmlProyecto(proyecto));
}

export function imprimirPatron(patron) {
    imprimirDocumento(htmlPatron(patron));
}

// ---------------------------------------------------------------------------
// PNG (resumen dibujado en Canvas)
// ---------------------------------------------------------------------------
function lineasProyecto(proyecto) {
    const p = proyecto || {};
    const costo = p.costo || {};
    const mat = p.materialesUsados || {};
    const lineas = [
        { tipo: "titulo", texto: p.nombre || "Sin nombre" },
        { tipo: "subtitulo", texto: `${p.tipo || "amigurumi"} · ${nombreEstado(p.estado)}` },
        { tipo: "muted", texto: `Modificado: ${formatearFecha(p.fechaModificacion)}` },
        { tipo: "separador" },
        { tipo: "seccion", texto: "Costos" },
        { tipo: "texto", texto: `Lanas: ${formatearMoneda(costo.lanas)}` },
        { tipo: "texto", texto: `Relleno: ${formatearMoneda(costo.relleno)}` },
        { tipo: "texto", texto: `Componentes: ${formatearMoneda(costo.componentes)}` },
        { tipo: "texto", texto: `Mano de obra: ${formatearMoneda(costo.manoObra)}` },
        { tipo: "total", texto: `Total: ${formatearMoneda(costo.total)}` },
        { tipo: "espacio" },
        { tipo: "seccion", texto: "Precio de venta" },
        { tipo: "texto", texto: `Precio ideal (+50 %): ${formatearMoneda(costo.precioIdeal)}` },
    ];

    if (costo.precioVenta > 0) {
        lineas.push({ tipo: "texto", texto: `Precio de venta: ${formatearMoneda(costo.precioVenta)}` });
        lineas.push({ tipo: "texto", texto: `Ganancia: ${formatearMoneda(costo.ganancia)}` });
        lineas.push({ tipo: "texto", texto: `Margen: ${(Number(costo.margen) || 0).toFixed(1)} %` });
    } else {
        lineas.push({ tipo: "muted", texto: "Precio de venta sin definir." });
    }

    lineas.push({ tipo: "espacio" }, { tipo: "seccion", texto: "Materiales usados" });
    const materiales = [];
    if (mat.lana && (mat.lana.color || mat.lana.marca || mat.lana.gramosUsados)) {
        materiales.push(
            `Lana: ${[mat.lana.color, mat.lana.marca].filter(Boolean).join(" ") || "-"} — ${Number(mat.lana.gramosUsados) || 0} g`
        );
    }
    if (mat.relleno && (mat.relleno.tipo || mat.relleno.marca || mat.relleno.gramosUsados)) {
        materiales.push(
            `Relleno: ${[mat.relleno.tipo, mat.relleno.marca].filter(Boolean).join(" ") || "-"} — ${Number(mat.relleno.gramosUsados) || 0} g`
        );
    }
    (mat.componentes || []).forEach((c) => {
        materiales.push(`${c.tipo || "-"} — ${Number(c.cantidadUtilizada) || 0} ud.`);
    });
    if (materiales.length) materiales.forEach((texto) => lineas.push({ tipo: "texto", texto }));
    else lineas.push({ tipo: "muted", texto: "Sin materiales registrados." });

    lineas.push({ tipo: "espacio" }, { tipo: "seccion", texto: "Secciones" });
    const secciones = Array.isArray(p.secciones) ? p.secciones : [];
    if (secciones.length) {
        secciones.forEach((s) => {
            lineas.push({
                tipo: "texto",
                texto: `${s.nombre || "Sin nombre"} — ${Number(s.puntos) || 0} pts · ${Number(s.vueltas) || 0} vueltas · ${Number(s.altura) || 0} cm`,
            });
            if (s.notas) lineas.push({ tipo: "muted", texto: `  ${s.notas}` });
        });
    } else {
        lineas.push({ tipo: "muted", texto: "Sin secciones." });
    }

    if (p.notas) {
        lineas.push({ tipo: "espacio" }, { tipo: "seccion", texto: "Notas" });
        lineas.push({ tipo: "texto", texto: p.notas });
    }

    lineas.push(
        { tipo: "espacio" },
        { tipo: "muted", texto: `Generado el ${formatearFecha(new Date().toISOString())}` }
    );
    return lineas;
}

function lineasPatron(patron) {
    const p = patron || {};
    const lineas = [
        { tipo: "titulo", texto: p.nombre || "Sin nombre" },
        { tipo: "subtitulo", texto: `${p.codigo || ""} · ${p.categoria || "Sin categoría"}` },
        { tipo: "muted", texto: `Modificado: ${formatearFecha(p.fechaModificacion)}` },
        { tipo: "separador" },
        { tipo: "seccion", texto: "Materiales necesarios" },
    ];

    const materiales = Array.isArray(p.materiales) ? p.materiales : [];
    if (materiales.length) {
        materiales.forEach((m) => {
            const cantidad = m.cantidad ? `${m.cantidad}${m.unidad ? " " + m.unidad : ""}` : m.unidad || "";
            lineas.push({ tipo: "texto", texto: `${m.nombre || "-"}${cantidad ? ` — ${cantidad}` : ""}` });
        });
    } else {
        lineas.push({ tipo: "muted", texto: "Sin materiales cargados." });
    }

    if (p.materialesTexto) {
        lineas.push({ tipo: "espacio" }, { tipo: "seccion", texto: "Materiales (notas)" });
        lineas.push({ tipo: "texto", texto: p.materialesTexto });
    }

    lineas.push({ tipo: "espacio" }, { tipo: "seccion", texto: "Instrucciones" });
    lineas.push({ tipo: "texto", texto: p.instrucciones || "Sin instrucciones." });
    lineas.push(
        { tipo: "espacio" },
        { tipo: "muted", texto: `Generado el ${formatearFecha(new Date().toISOString())}` }
    );
    return lineas;
}

function envolverTexto(ctx, texto, anchoMax) {
    const palabras = String(texto == null ? "" : texto).split(/\s+/);
    const lineas = [];
    let actual = "";

    const partirPalabra = (palabra) => {
        let resto = palabra;
        while (resto.length) {
            let corte = resto.length;
            while (corte > 1 && ctx.measureText(resto.slice(0, corte)).width > anchoMax) corte -= 1;
            lineas.push(resto.slice(0, corte));
            resto = resto.slice(corte);
        }
    };

    palabras.forEach((palabra) => {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (ctx.measureText(prueba).width <= anchoMax) {
            actual = prueba;
            return;
        }
        if (actual) lineas.push(actual);
        if (ctx.measureText(palabra).width > anchoMax) {
            partirPalabra(palabra);
            actual = "";
        } else {
            actual = palabra;
        }
    });

    if (actual) lineas.push(actual);
    return lineas.length ? lineas : [""];
}

const ESTILOS_PNG = {
    titulo: { fuente: "700 40px 'Segoe UI', Arial, sans-serif", color: "#8f123c", alto: 54, margen: 8 },
    subtitulo: { fuente: "600 22px 'Segoe UI', Arial, sans-serif", color: "#4a2b36", alto: 34, margen: 4 },
    seccion: { fuente: "700 25px 'Segoe UI', Arial, sans-serif", color: "#b0184a", alto: 44, margen: 14 },
    texto: { fuente: "400 21px 'Segoe UI', Arial, sans-serif", color: "#2b1a20", alto: 31, margen: 2 },
    total: { fuente: "700 23px 'Segoe UI', Arial, sans-serif", color: "#8f123c", alto: 36, margen: 6 },
    muted: { fuente: "400 18px 'Segoe UI', Arial, sans-serif", color: "#6b4a56", alto: 27, margen: 2 },
    separador: { fuente: "400 1px 'Segoe UI', Arial, sans-serif", color: "#e6c6d1", alto: 22, margen: 0 },
    espacio: { fuente: "400 1px 'Segoe UI', Arial, sans-serif", color: "#ffffff", alto: 18, margen: 0 },
};

function dibujarPNG(lineas, nombreArchivo) {
    if (typeof document === "undefined") return;

    const ancho = 1000;
    const padding = 60;
    const anchoTexto = ancho - padding * 2;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const operaciones = [];
    let alto = padding;

    lineas.forEach((linea) => {
        const estilo = ESTILOS_PNG[linea.tipo] || ESTILOS_PNG.texto;
        ctx.font = estilo.fuente;
        const partes = envolverTexto(ctx, linea.texto || "", anchoTexto);
        alto += estilo.margen + estilo.alto * partes.length;
        operaciones.push({ estilo, partes, y: alto - estilo.alto * partes.length });
    });

    alto += padding;
    const escala = 2;
    canvas.width = ancho * escala;
    canvas.height = Math.max(alto, 400) * escala;
    ctx.scale(escala, escala);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, Math.max(alto, 400));

    // Franja superior de color.
    ctx.fillStyle = "#b0184a";
    ctx.fillRect(0, 0, ancho, 12);

    operaciones.forEach(({ estilo, partes, y }, indice) => {
        ctx.font = estilo.fuente;
        ctx.fillStyle = estilo.color;

        if (lineas[indice].tipo === "separador") {
            ctx.strokeStyle = estilo.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, y + estilo.alto / 2);
            ctx.lineTo(ancho - padding, y + estilo.alto / 2);
            ctx.stroke();
            return;
        }

        partes.forEach((parte, i) => {
            ctx.fillText(parte, padding, y + estilo.alto * 0.7 + i * estilo.alto);
        });
    });

    const descargar = (blob) => {
        if (blob) descargarBlob(nombreArchivo, blob);
    };
    if (canvas.toBlob) canvas.toBlob(descargar, "image/png");
    else {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = nombreArchivo;
        a.click();
    }
}

export function descargarProyectoPNG(proyecto) {
    const nombre = nombreArchivoSeguro(`proyecto-${proyecto && proyecto.nombre}`);
    dibujarPNG(lineasProyecto(proyecto), `${nombre}.png`);
}

export function descargarPatronPNG(patron) {
    const nombre = nombreArchivoSeguro(`patron-${patron && (patron.codigo || patron.nombre)}`);
    dibujarPNG(lineasPatron(patron), `${nombre}.png`);
}
