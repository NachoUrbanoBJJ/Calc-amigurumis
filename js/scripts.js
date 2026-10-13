import { calcularLana, calcularRelleno, calcularManoObra, calcularComponente, calcularTotalLanasYComponentes } from "./calculos.js";
import { mostrarComponente, formatearMoneda, mostrarListaComponentes, mostrarDesgloseComponentes } from "./ui.js";
import {
    cargarProyectosPlan,
    guardarProyectosPlan,
    crearProyecto,
    agregarSeccion,
    eliminarSeccion,
    cargarPatrones,
    guardarPatrones,
    agregarPatron,
    eliminarPatron,
    cargarProyectosGuardados,
    guardarProyectosGuardados,
    guardarProyectoCalculado
} from "./planificador.js";
import {
    cargarInventario,
    guardarInventario,
    agregarLanaInventario,
    agregarRellenoInventario,
    agregarComponenteInventario
} from "./inventario.js";

const componentes = [];

const tipoComponente = document.getElementById("tipoComponente");
const datosComponentes = document.getElementById("datosComponentes");
const btnAgregarComponente = document.getElementById("btnAgregarComponente");
const listaComponentes = document.getElementById("listaComponentes");
const btnCalcular = document.getElementById("btnCalcular");
const btnLimpiar = document.getElementById("btnLimpiar");
const resultados = document.getElementById("resultados");

if (tipoComponente) {
    tipoComponente.addEventListener("change", () => mostrarComponente(datosComponentes, tipoComponente));
    mostrarComponente(datosComponentes, tipoComponente);
}

if (btnAgregarComponente) {
    btnAgregarComponente.addEventListener("click", agregarComponente);
}

if (btnCalcular) {
    btnCalcular.addEventListener("click", calcularTodo);
}

if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarTodo);
}

// Navegación
const navBtns = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".section");
navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        navBtns.forEach(b => b.classList.remove("active"));
        sections.forEach(s => s.classList.remove("active"));
        btn.classList.add("active");
        const sec = document.getElementById(`section-${btn.dataset.section}`);
        if (sec) sec.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

// Planificador - estado
let proyectosPlan = cargarProyectosPlan();
let proyectoActivo = null;
let patrones = cargarPatrones();
let proyectosGuardados = cargarProyectosGuardados();
let inventario = cargarInventario();

// Guardar desde calculadora
const btnGuardarDesdeCalculadora = document.getElementById("btnGuardarDesdeCalculadora");
if (btnGuardarDesdeCalculadora) {
    btnGuardarDesdeCalculadora.addEventListener("click", () => {
        const nombre = document.getElementById("nombreProyectoCalc").value.trim();
        if (!nombre) {
            alert("Escribe un nombre para el proyecto");
            return;
        }
        const precioOvillo = Number(document.getElementById("precioOvillo").value);
        const gramosOvillo = Number(document.getElementById("gramosOvillo").value);
        const gramosUsados = Number(document.getElementById("gramosUsados").value);
        const precioRelleno = Number(document.getElementById("precioRelleno").value);
        const gramosRelleno = Number(document.getElementById("gramosRelleno").value);
        const rellenoUsado = Number(document.getElementById("rellenoUsado").value);
        const horasTrabajadas = Number(document.getElementById("horasTrabajadas").value);
        const valorHora = Number(document.getElementById("valorHoras").value);
        const costoLanas = calcularLana(precioOvillo, gramosOvillo, gramosUsados);
        const costoRellenoCalc = calcularRelleno(precioRelleno, gramosRelleno, rellenoUsado);
        const costoManoObraCalc = calcularManoObra(horasTrabajadas, valorHora);
        const costoComponentesCalc = calcularTotalLanasYComponentes(componentes);
        const total = costoLanas + costoRellenoCalc + costoComponentesCalc + costoManoObraCalc;
        const nuevo = guardarProyectoCalculado({
            nombre,
            tipo: "calculado",
            costo: { lanas: costoLanas, relleno: costoRellenoCalc, componentes: costoComponentesCalc, manoObra: costoManoObraCalc, total },
            materialesUsados: {
                lana: { color: document.getElementById("colorLana").value, marca: document.getElementById("marcaLana").value, gramosUsados },
                relleno: { tipo: document.getElementById("tipoRelleno").value, marca: document.getElementById("marcaRelleno").value, gramosUsados: rellenoUsado },
                componentes: JSON.parse(JSON.stringify(componentes))
            },
            secciones: []
        });
        proyectosGuardados.unshift(nuevo);
        guardarProyectosGuardados(proyectosGuardados);
        document.getElementById("nombreProyectoCalc").value = "";
        renderProyectosGuardados();
        alert("Proyecto guardado correctamente");
    });
}

// Inventario
const btnAgregarLanaInv = document.getElementById("btnAgregarLanaInv");
if (btnAgregarLanaInv) {
    btnAgregarLanaInv.addEventListener("click", () => {
        const lana = {
            color: document.getElementById("invColorLana").value.trim(),
            marca: document.getElementById("invMarcaLana").value.trim(),
            precioOvillo: Number(document.getElementById("invPrecioOvillo").value),
            gramosOvillo: Number(document.getElementById("invGramosOvillo").value),
            gramosDisponibles: Number(document.getElementById("invGramosDisponibles").value),
        };
        if (lana.gramosDisponibles < 0 || lana.precioOvillo < 0 || lana.gramosOvillo <= 0) {
            alert("Revisa valores de lana para inventario");
            return;
        }
        inventario = agregarLanaInventario(inventario, lana);
        guardarInventario(inventario);
        renderInventario();
        document.getElementById("invColorLana").value = "";
        document.getElementById("invMarcaLana").value = "";
        document.getElementById("invPrecioOvillo").value = "";
        document.getElementById("invGramosOvillo").value = "";
        document.getElementById("invGramosDisponibles").value = "";
    });
}

const btnAgregarRellenoInv = document.getElementById("btnAgregarRellenoInv");
if (btnAgregarRellenoInv) {
    btnAgregarRellenoInv.addEventListener("click", () => {
        const relleno = {
            tipo: document.getElementById("invTipoRelleno").value.trim(),
            marca: document.getElementById("invMarcaRelleno").value.trim(),
            precioRelleno: Number(document.getElementById("invPrecioRelleno").value),
            gramosRelleno: Number(document.getElementById("invGramosRellenoTot").value),
            gramosDisponibles: Number(document.getElementById("invGramosRellenoDisp").value),
        };
        if (relleno.gramosDisponibles < 0 || relleno.precioRelleno < 0 || relleno.gramosRelleno <= 0) {
            alert("Revisa valores de relleno para inventario");
            return;
        }
        inventario = agregarRellenoInventario(inventario, relleno);
        guardarInventario(inventario);
        renderInventario();
        document.getElementById("invTipoRelleno").value = "";
        document.getElementById("invMarcaRelleno").value = "";
        document.getElementById("invPrecioRelleno").value = "";
        document.getElementById("invGramosRellenoTot").value = "";
        document.getElementById("invGramosRellenoDisp").value = "";
    });
}

const btnAgregarCompInv = document.getElementById("btnAgregarCompInv");
if (btnAgregarCompInv) {
    btnAgregarCompInv.addEventListener("click", () => {
        const comp = {
            tipo: document.getElementById("invTipoComp").value.trim(),
            cantidadComprada: Number(document.getElementById("invCantCompradaComp").value),
            precioCompra: Number(document.getElementById("invPrecioCompraComp").value),
            cantidadDisponible: Number(document.getElementById("invCantDispComp").value),
        };
        if (comp.cantidadDisponible < 0 || comp.precioCompra < 0 || comp.cantidadComprada <= 0) {
            alert("Revisa valores de componente para inventario");
            return;
        }
        inventario = agregarComponenteInventario(inventario, comp);
        guardarInventario(inventario);
        renderInventario();
        document.getElementById("invTipoComp").value = "";
        document.getElementById("invCantCompradaComp").value = "";
        document.getElementById("invPrecioCompraComp").value = "";
        document.getElementById("invCantDispComp").value = "";
    });
}

const btnVaciarInventario = document.getElementById("btnVaciarInventario");
if (btnVaciarInventario) {
    btnVaciarInventario.addEventListener("click", () => {
        if (confirm("¿Vaciar todo el inventario? Esta acción no se puede deshacer.")) {
            inventario = { lanas: [], rellenos: [], componentes: [] };
            guardarInventario(inventario);
            renderInventario();
        }
    });
}

const btnExportarInventario = document.getElementById("btnExportarInventario");
if (btnExportarInventario) {
    btnExportarInventario.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(inventario, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventario-amigurumis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

const inputImportarInventario = document.getElementById("inputImportarInventario");
if (inputImportarInventario) {
    inputImportarInventario.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                inventario = {
                    lanas: Array.isArray(data.lanas) ? data.lanas : [],
                    rellenos: Array.isArray(data.rellenos) ? data.rellenos : [],
                    componentes: Array.isArray(data.componentes) ? data.componentes : []
                };
                guardarInventario(inventario);
                renderInventario();
                alert("Inventario importado correctamente");
            } catch (err) {
                alert("Archivo JSON inválido");
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}

// Planificador - crear proyecto
const btnCrearProyecto = document.getElementById("btnCrearProyecto");
if (btnCrearProyecto) {
    btnCrearProyecto.addEventListener("click", () => {
        const nombre = document.getElementById("planNombreProyecto").value.trim();
        if (!nombre) {
            alert("Escribe un nombre para el proyecto");
            return;
        }
        proyectoActivo = crearProyecto(nombre, document.getElementById("planTipoProyecto").value, document.getElementById("planNotasProyecto").value.trim());
        proyectosPlan.push(proyectoActivo);
        guardarProyectosPlan(proyectosPlan);
        renderProyectoActivo();
        document.getElementById("planNombreProyecto").value = "";
        document.getElementById("planNotasProyecto").value = "";
    });
}

const btnAgregarSeccion = document.getElementById("btnAgregarSeccion");
if (btnAgregarSeccion) {
    btnAgregarSeccion.addEventListener("click", () => {
        if (!proyectoActivo) {
            alert("Crea un proyecto primero");
            return;
        }
        const datos = {
            nombre: document.getElementById("planNombreSeccion").value.trim(),
            puntos: document.getElementById("planPuntosSeccion").value,
            vueltas: document.getElementById("planVueltasSeccion").value,
            altura: document.getElementById("planAlturaSeccion").value,
            notas: document.getElementById("planNotasSeccion").value.trim(),
        };
        if (!datos.nombre) {
            alert("Escribe un nombre para la sección");
            return;
        }
        agregarSeccion(proyectoActivo, datos);
        guardarProyectosPlan(proyectosPlan);
        renderProyectoActivo();
        document.getElementById("planNombreSeccion").value = "";
        document.getElementById("planPuntosSeccion").value = "";
        document.getElementById("planVueltasSeccion").value = "";
        document.getElementById("planAlturaSeccion").value = "";
        document.getElementById("planNotasSeccion").value = "";
    });
}

const btnCerrarProyectoActivo = document.getElementById("btnCerrarProyectoActivo");
if (btnCerrarProyectoActivo) {
    btnCerrarProyectoActivo.addEventListener("click", () => {
        proyectoActivo = null;
        renderProyectoActivo();
    });
}

const btnDescartarProyectoActivo = document.getElementById("btnDescartarProyectoActivo");
if (btnDescartarProyectoActivo) {
    btnDescartarProyectoActivo.addEventListener("click", () => {
        if (!proyectoActivo) return;
        if (confirm("¿Descartar cambios del proyecto activo?")) {
            const idx = proyectosPlan.findIndex(p => p.id === proyectoActivo.id);
            if (idx > -1) proyectosPlan.splice(idx, 1);
            guardarProyectosPlan(proyectosPlan);
            proyectoActivo = null;
            renderProyectoActivo();
        }
    });
}

const btnGuardarProyectoCompleto = document.getElementById("btnGuardarProyectoCompleto");
if (btnGuardarProyectoCompleto) {
    btnGuardarProyectoCompleto.addEventListener("click", () => {
        if (!proyectoActivo) return;
        const nuevo = guardarProyectoCalculado({
            nombre: proyectoActivo.nombre,
            tipo: proyectoActivo.tipo,
            notas: proyectoActivo.notas + "\n\n[SECCIONES]\n" + proyectoActivo.secciones.map(s => `- ${s.nombre}: pts=${s.puntos} v=${s.vueltas} h=${s.altura}cm. ${s.notas}`).join("\n"),
            costo: { lanas: 0, relleno: 0, componentes: 0, manoObra: 0, total: 0 },
            materialesUsados: { lana: null, relleno: null, componentes: [] },
            secciones: JSON.parse(JSON.stringify(proyectoActivo.secciones))
        });
        proyectosGuardados.unshift(nuevo);
        guardarProyectosGuardados(proyectosGuardados);
        const idx = proyectosPlan.findIndex(p => p.id === proyectoActivo.id);
        if (idx > -1) proyectosPlan.splice(idx, 1);
        guardarProyectosPlan(proyectosPlan);
        proyectoActivo = null;
        renderProyectoActivo();
        renderProyectosGuardados();
        alert("Proyecto planificado guardado correctamente");
    });
}

// Patrones
const btnGuardarPatron = document.getElementById("btnGuardarPatron");
if (btnGuardarPatron) {
    btnGuardarPatron.addEventListener("click", () => {
        const datos = {
            nombre: document.getElementById("patronNombre").value.trim(),
            categoria: document.getElementById("patronCategoria").value.trim(),
            materiales: document.getElementById("patronMateriales").value.trim(),
            instrucciones: document.getElementById("patronInstrucciones").value.trim(),
        };
        if (!datos.nombre) {
            alert("Escribe un nombre para el patrón");
            return;
        }
        patrones.push(agregarPatron(datos));
        guardarPatrones(patrones);
        renderPatrones();
        document.getElementById("patronNombre").value = "";
        document.getElementById("patronCategoria").value = "";
        document.getElementById("patronMateriales").value = "";
        document.getElementById("patronInstrucciones").value = "";
    });
}

// Backup
const btnExportarTodo = document.getElementById("btnExportarTodo");
if (btnExportarTodo) {
    btnExportarTodo.addEventListener("click", () => {
        const backup = {
            inventario,
            patrones,
            proyectosGuardados,
            proyectosPlan
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-amigurumis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

const inputImportarTodo = document.getElementById("inputImportarTodo");
if (inputImportarTodo) {
    inputImportarTodo.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.inventario) inventario = data.inventario;
                if (Array.isArray(data.patrones)) patrones = data.patrones;
                if (Array.isArray(data.proyectosGuardados)) proyectosGuardados = data.proyectosGuardados;
                if (Array.isArray(data.proyectosPlan)) proyectosPlan = data.proyectosPlan;
                guardarInventario(inventario);
                guardarPatrones(patrones);
                guardarProyectosGuardados(proyectosGuardados);
                guardarProyectosPlan(proyectosPlan);
                renderAll();
                alert("Backup importado correctamente");
            } catch (err) {
                alert("Archivo JSON inválido");
            }
            e.target.value = "";
        };
        reader.readAsText(file);
    });
}

// Render functions
function renderInventario() {
    const l = document.getElementById("listaLanasInv");
    const r = document.getElementById("listaRellenosInv");
    const c = document.getElementById("listaComponentesInv");
    if (l) {
        l.innerHTML = "";
        if (!inventario.lanas.length) { l.innerHTML = "<p style='color:#666;font-style:italic'>Sin lanas</p>"; }
        else inventario.lanas.forEach(x => {
            const div = document.createElement("div");
            div.className = "item-card";
            div.innerHTML = `<div class="item-header"><span class="item-title">${x.color || "Sin color"}</span><span class="item-badges"><span class="badge">${x.marca || ""}</span></span></div><div class="item-details"><span>Disp: ${x.gramosDisponibles}g</span><span>Ovillo: ${x.gramosOvillo}g - €${x.precioOvillo.toFixed(2)}</span></div>`;
            l.appendChild(div);
        });
    }
    if (r) {
        r.innerHTML = "";
        if (!inventario.rellenos.length) { r.innerHTML = "<p style='color:#666;font-style:italic'>Sin relleno</p>"; }
        else inventario.rellenos.forEach(x => {
            const div = document.createElement("div");
            div.className = "item-card";
            div.innerHTML = `<div class="item-header"><span class="item-title">${x.tipo || "Sin tipo"}</span><span class="item-badges"><span class="badge">${x.marca || ""}</span></span></div><div class="item-details"><span>Disp: ${x.gramosDisponibles}g</span><span>Total: ${x.gramosRelleno}g - €${x.precioRelleno.toFixed(2)}</span></div>`;
            r.appendChild(div);
        });
    }
    if (c) {
        c.innerHTML = "";
        if (!inventario.componentes.length) { c.innerHTML = "<p style='color:#666;font-style:italic'>Sin componentes</p>"; }
        else inventario.componentes.forEach(x => {
            const div = document.createElement("div");
            div.className = "item-card";
            div.innerHTML = `<div class="item-header"><span class="item-title">${x.tipo || "Sin tipo"}</span></div><div class="item-details"><span>Disp: ${x.cantidadDisponible} ud.</span><span>Comprados: ${x.cantidadComprada} ud. - €${x.precioCompra.toFixed(2)}</span></div>`;
            c.appendChild(div);
        });
    }
}

function renderProyectoActivo() {
    const editor = document.getElementById("editorProyecto");
    if (!editor) return;
    if (!proyectoActivo) { editor.style.display = "none"; return; }
    editor.style.display = "block";
    document.getElementById("nombreProyectoActivo").textContent = proyectoActivo.nombre;
    document.getElementById("tipoProyectoActivo").textContent = proyectoActivo.tipo;
    const lista = document.getElementById("listaSeccionesProyecto");
    lista.innerHTML = "";
    if (!proyectoActivo.secciones.length) {
        lista.innerHTML = "<p style='color:#666;font-style:italic'>Sin secciones añadidas</p>";
    } else {
        proyectoActivo.secciones.forEach(s => {
            const div = document.createElement("div");
            div.className = "seccion-card";
            div.innerHTML = `<div class="seccion-header"><span class="seccion-title">${s.nombre}</span><div class="item-actions"><button class="btn-danger" data-del-seccion="${s.id}">Eliminar</button></div></div><div class="seccion-details"><span><strong>Puntos:</strong> ${s.puntos}</span><span><strong>Vueltas/Filas:</strong> ${s.vueltas}</span><span><strong>Altura:</strong> ${s.altura}cm</span></div>${s.notas ? `<div class="seccion-notas">${escapeHtml(s.notas)}</div>` : ""}`;
            lista.appendChild(div);
        });
        lista.querySelectorAll("[data-del-seccion]").forEach(btn => {
            btn.addEventListener("click", () => {
                eliminarSeccion(proyectoActivo, btn.dataset.delSeccion);
                guardarProyectosPlan(proyectosPlan);
                renderProyectoActivo();
            });
        });
    }
}

function renderProyectosGuardados() {
    const lista = document.getElementById("listaProyectosGuardados");
    const vacio = document.getElementById("accionesProyectosVacios");
    if (!lista) return;
    lista.innerHTML = "";
    if (!proyectosGuardados.length) {
        if (vacio) vacio.style.display = "flex";
        return;
    }
    if (vacio) vacio.style.display = "none";
    proyectosGuardados.forEach(p => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `<div class="item-header"><span class="item-title">${p.nombre}</span><span class="item-badges"><span class="badge">${p.tipo}</span></span></div><div class="item-details"><span>Coste total: ${formatearMoneda(p.costo?.total || 0)}</span><span>Secciones: ${(p.secciones||[]).length}</span><span>Guardado: ${new Date(p.fecha).toLocaleString("es-ES")}</span></div>${p.notas ? `<div class="seccion-notas">${escapeHtml(p.notas)}</div>` : ""}`;
        lista.appendChild(div);
    });
}

function renderPatrones() {
    const lista = document.getElementById("listaPatrones");
    if (!lista) return;
    lista.innerHTML = "";
    if (!patrones.length) {
        lista.innerHTML = "<p style='color:#666;font-style:italic'>Sin patrones guardados</p>";
        return;
    }
    patrones.forEach(p => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `<div class="item-header"><span class="item-title">${p.nombre}</span><span class="item-badges"><span class="badge">${p.categoria || ""}</span></span></div><div class="item-details"><span><strong>Materiales:</strong> ${escapeHtml(p.materiales || "")}</span></div>${p.instrucciones ? `<div class="seccion-notas"><strong>Instrucciones:</strong><br>${escapeHtml(p.instrucciones)}</div>` : ""}<div class="item-actions"><button class="btn-danger" data-del-patron="${p.id}">Eliminar</button></div>`;
        lista.appendChild(div);
    });
    lista.querySelectorAll("[data-del-patron]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (confirm("¿Eliminar este patrón?")) {
                eliminarPatron(patrones, btn.dataset.delPatron);
                guardarPatrones(patrones);
                renderPatrones();
            }
        });
    });
}

function renderAll() {
    renderInventario();
    renderProyectoActivo();
    renderProyectosGuardados();
    renderPatrones();
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}