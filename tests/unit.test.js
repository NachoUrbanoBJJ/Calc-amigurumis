import { test } from "node:test";
import assert from "node:assert/strict";

import {
    calcularLana,
    calcularRelleno,
    calcularManoObra,
    calcularComponente,
    calcularTotalComponentes,
    calcularPrecioIdeal,
    calcularVenta,
} from "../js/calculos.js";

import {
    costoVacio,
    generarCodigoPatron,
    normalizarPatron,
    normalizarPatrones,
    normalizarProyecto,
    crearProyecto,
    agregarSeccion,
    eliminarSeccion,
    duplicarProyecto,
    agregarPatron,
    eliminarPatron,
    guardarProyectos,
    cargarProyectos,
    guardarPatrones,
    cargarPatrones,
} from "../js/planificador.js";

import {
    agregarLanaInventario,
    agregarRellenoInventario,
    agregarComponenteInventario,
    descontarLana,
    descontarRelleno,
    descontarComponentes,
    guardarInventario,
    cargarInventario,
    normalizarInventario,
    coincideTexto,
    clasificarStock,
} from "../js/inventario.js";

import { esSeccionValida } from "../js/utils.js";

import { leerJson, guardarJson, storageDisponible } from "../js/almacenamiento.js";

import {
    CATEGORIAS_COMPONENTES_POR_DEFECTO,
    normalizarCategorias,
    normalizarListaCategorias,
    agregarCategoria,
    renombrarCategoria,
    eliminarCategoria,
    guardarCategorias,
    cargarCategorias,
} from "../js/categorias.js";

import { escaparCampoCSV, proyectoACSV, patronACSV, nombreArchivoSeguro } from "../js/exportar.js";

// ---------------------------------------------------------------------------
// localStorage mínimo para los módulos que persisten datos
// ---------------------------------------------------------------------------
function stubLocalStorage() {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
    };
    return store;
}

// ---------------------------------------------------------------------------
// calculos.js
// ---------------------------------------------------------------------------
test("calcularLana: precio por gramo usado", () => {
    assert.equal(calcularLana(1000, 100, 50), 500);
});

test("calcularLana: valores inválidos devuelven 0", () => {
    assert.equal(calcularLana(0, 100, 50), 0);
    assert.equal(calcularLana(1000, 0, 50), 0);
    assert.equal(calcularLana(1000, 100, -1), 0);
});

test("calcularRelleno: precio por gramo usado", () => {
    assert.equal(calcularRelleno(2000, 1000, 100), 200);
    assert.equal(calcularRelleno(0, 1000, 100), 0);
});

test("calcularManoObra: horas por valor hora", () => {
    assert.equal(calcularManoObra(2, 500), 1000);
    assert.equal(calcularManoObra(-1, 500), 0);
    assert.equal(calcularManoObra(2, -500), 0);
});

test("calcularComponente: fracción del precio de compra", () => {
    assert.equal(calcularComponente(10, 100, 2), 20);
    assert.equal(calcularComponente(0, 100, 2), 0);
});

test("calcularTotalComponentes: suma los costos", () => {
    const componentes = [
        { cantidadComprada: 10, precioCompra: 100, cantidadUtilizada: 2 },
        { cantidadComprada: 4, precioCompra: 40, cantidadUtilizada: 4 },
    ];
    assert.equal(calcularTotalComponentes(componentes), 60);
    assert.equal(calcularTotalComponentes([]), 0);
});

test("calcularPrecioIdeal: costo + 50 % por defecto", () => {
    assert.equal(calcularPrecioIdeal(100), 150);
    assert.equal(calcularPrecioIdeal(0), 0);
    assert.equal(calcularPrecioIdeal(-10), 0);
    assert.equal(calcularPrecioIdeal(200, 25), 250);
});

test("calcularPrecioIdeal: margen inválido usa el 50 %", () => {
    assert.equal(calcularPrecioIdeal(100, -5), 150);
    assert.equal(calcularPrecioIdeal(100, "abc"), 150);
});

test("calcularVenta: el precio manual tiene prioridad", () => {
    assert.deepEqual(calcularVenta(1000, 1500, 50), {
        precioVenta: 1500,
        ganancia: 500,
        margen: 50,
    });
});

test("calcularVenta: sin precio manual usa el margen", () => {
    assert.deepEqual(calcularVenta(1000, null, 25), {
        precioVenta: 1250,
        ganancia: 250,
        margen: 25,
    });
});

test("calcularVenta: sin precio ni margen no inventa un precio", () => {
    assert.deepEqual(calcularVenta(1000, "", ""), { precioVenta: 0, ganancia: 0, margen: 0 });
    assert.deepEqual(calcularVenta(1000, 0, null), { precioVenta: 0, ganancia: 0, margen: 0 });
});

// ---------------------------------------------------------------------------
// planificador.js — proyectos
// ---------------------------------------------------------------------------
test("costoVacio: todos los campos en 0", () => {
    const c = costoVacio();
    assert.deepEqual(c, {
        lanas: 0,
        relleno: 0,
        componentes: 0,
        manoObra: 0,
        total: 0,
        precioIdeal: 0,
        precioVenta: 0,
        ganancia: 0,
        margen: 0,
    });
});

test("normalizarProyecto: completa campos faltantes y define estado", () => {
    const p = normalizarProyecto({ nombre: "Test" });
    assert.equal(p.nombre, "Test");
    assert.equal(p.tipo, "amigurumi");
    assert.equal(p.estado, "planificando");
    assert.equal(p.costo.total, 0);
    assert.equal(p.costo.precioIdeal, 0);
    assert.ok(Array.isArray(p.secciones));
    assert.ok(p.id);

    const conTotal = normalizarProyecto({ costo: { total: 100 } });
    assert.equal(conTotal.estado, "terminado");
    assert.equal(conTotal.costo.precioIdeal, 150);
});

test("crearProyecto: proyecto nuevo vacío", () => {
    const p = crearProyecto("Osito", "amigurumi", "nota");
    assert.equal(p.nombre, "Osito");
    assert.equal(p.tipo, "amigurumi");
    assert.equal(p.notas, "nota");
    assert.equal(p.estado, "planificando");
    assert.equal(p.costo.total, 0);
    assert.equal(p.secciones.length, 0);
});

test("agregarSeccion / eliminarSeccion", () => {
    const p = crearProyecto("Osito");
    const s = agregarSeccion(p, { nombre: "Cabeza", puntos: 6, vueltas: 3, altura: 4 });
    assert.equal(p.secciones.length, 1);
    assert.equal(p.secciones[0].nombre, "Cabeza");
    assert.equal(p.secciones[0].puntos, 6);
    assert.equal(eliminarSeccion(p, s.id), true);
    assert.equal(p.secciones.length, 0);
    assert.equal(eliminarSeccion(p, "no-existe"), false);
});

test("guardarProyectos / cargarProyectos: ida y vuelta", () => {
    stubLocalStorage();
    const p = crearProyecto("Osito");
    guardarProyectos([p]);
    const cargados = cargarProyectos();
    assert.equal(cargados.length, 1);
    assert.equal(cargados[0].nombre, "Osito");
    assert.equal(cargados[0].id, p.id);
});

test("duplicarProyecto: copia independiente con ids y fechas nuevas", () => {
    const original = crearProyecto("Osito");
    original.costo.total = 1000;
    original.costo.precioIdeal = 1500;
    agregarSeccion(original, { nombre: "Cabeza", puntos: 6, vueltas: 3, altura: 4 });
    original.materialesUsados.lana = { color: "Rojo", marca: "Ovillos SA", gramosUsados: 50 };

    const copia = duplicarProyecto(original);

    assert.notEqual(copia.id, original.id);
    assert.equal(copia.nombre, "Osito (copia)");
    assert.equal(copia.secciones.length, 1);
    assert.equal(copia.secciones[0].nombre, "Cabeza");
    assert.notEqual(copia.secciones[0].id, original.secciones[0].id);
    assert.equal(copia.costo.total, 1000);
    assert.equal(copia.costo.precioIdeal, 1500);

    copia.materialesUsados.lana.color = "Azul";
    assert.equal(original.materialesUsados.lana.color, "Rojo");

    copia.secciones[0].nombre = "Cabeza copia";
    assert.equal(original.secciones[0].nombre, "Cabeza");
});

// ---------------------------------------------------------------------------
// exportar.js — CSV
// ---------------------------------------------------------------------------
test("escaparCampoCSV: comillas, separador y saltos de línea", () => {
    assert.equal(escaparCampoCSV("simple"), "simple");
    assert.equal(escaparCampoCSV("con;separador"), '"con;separador"');
    assert.equal(escaparCampoCSV('dice "hola"'), '"dice ""hola"""');
    assert.equal(escaparCampoCSV("dos\nlíneas"), '"dos\nlíneas"');
});

test("nombreArchivoSeguro: quita caracteres inválidos y no queda vacío", () => {
    const nombre = nombreArchivoSeguro('proyecto: "osito"/1');
    assert.doesNotMatch(nombre, /[\\/:*?"<>|]/);
    assert.ok(nombre.length > 0);
    assert.equal(nombreArchivoSeguro("   "), "documento");
});

test("proyectoACSV: incluye costos, precio ideal, secciones y notas escapadas", () => {
    const p = crearProyecto("Osito; grande");
    p.costo = {
        lanas: 100,
        relleno: 20,
        componentes: 30,
        manoObra: 0,
        total: 150,
        precioIdeal: 225,
        precioVenta: 0,
        ganancia: 0,
        margen: 0,
    };
    agregarSeccion(p, { nombre: "Cabeza", puntos: 6, vueltas: 3, altura: 4, notas: 'decir "hola"; suave' });

    const csv = proyectoACSV(p);

    assert.match(csv, /Nombre;"Osito; grande"/);
    assert.match(csv, /Total;150,00/);
    assert.match(csv, /Precio ideal \(\+50 %\);225,00/);
    assert.match(csv, /Cabeza;6;3;4;"decir ""hola""; suave"/);
});

test("patronACSV: incluye materiales e instrucciones con saltos", () => {
    const csv = patronACSV({
        codigo: "PAT-0001",
        nombre: "Osito",
        categoria: "Amigurumi",
        materiales: [{ nombre: "Lana", cantidad: 50, unidad: "g" }],
        instrucciones: "Vuelta 1: 6 pb\nVuelta 2: aumento",
    });

    assert.match(csv, /Código;PAT-0001/);
    assert.match(csv, /Lana;50;g/);
    assert.match(csv, /"Vuelta 1: 6 pb\nVuelta 2: aumento"/);
});

// ---------------------------------------------------------------------------
// planificador.js — patrones
// ---------------------------------------------------------------------------
test("generarCodigoPatron: correlativo PAT-000x", () => {
    assert.equal(generarCodigoPatron([]), "PAT-0001");
    assert.equal(generarCodigoPatron([{ codigo: "PAT-0005" }]), "PAT-0006");
    assert.equal(generarCodigoPatron([{ codigo: "PAT-0001" }, { codigo: "PAT-0009" }]), "PAT-0010");
});

test("normalizarPatron: migra materiales de texto plano", () => {
    const p = normalizarPatron({ nombre: "Legacy", materiales: "lana roja, aguja 3mm" });
    assert.deepEqual(p.materiales, []);
    assert.equal(p.materialesTexto, "lana roja, aguja 3mm");
});

test("normalizarPatrones: asigna códigos a los que no tienen (sin colisionar)", () => {
    const lista = normalizarPatrones([{ nombre: "A" }, { nombre: "B", codigo: "PAT-0003" }]);
    // El código nuevo se calcula sobre el máximo existente para no pisar PAT-0003.
    assert.equal(lista[0].codigo, "PAT-0004");
    assert.equal(lista[1].codigo, "PAT-0003");
    // El siguiente código libre continúa la serie
    assert.equal(generarCodigoPatron(lista), "PAT-0005");
});

test("agregarPatron / eliminarPatron", () => {
    const p = agregarPatron(
        { nombre: "Osito", categoria: "Amigurumi", materiales: [{ nombre: "Lana", cantidad: 50, unidad: "g" }] },
        "PAT-0001"
    );
    assert.equal(p.codigo, "PAT-0001");
    assert.equal(p.materiales.length, 1);
    assert.equal(p.materiales[0].nombre, "Lana");

    const lista = [p];
    assert.equal(eliminarPatron(lista, p.id), true);
    assert.equal(lista.length, 0);
    assert.equal(eliminarPatron(lista, "no-existe"), false);
});

test("guardarPatrones / cargarPatrones: ida y vuelta con código estable", () => {
    stubLocalStorage();
    guardarPatrones([agregarPatron({ nombre: "Osito" }, "PAT-0001")]);
    const cargados = cargarPatrones();
    assert.equal(cargados.length, 1);
    assert.equal(cargados[0].codigo, "PAT-0001");
    assert.equal(cargados[0].nombre, "Osito");
});

// ---------------------------------------------------------------------------
// inventario.js
// ---------------------------------------------------------------------------
function invConLana(gramos) {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarLanaInventario(inv, {
        color: "Rojo",
        marca: "Ovillos SA",
        precioOvillo: 1000,
        gramosOvillo: 100,
        gramosDisponibles: gramos,
    });
    return inv;
}

test("descontarLana: descuenta del color coincidente", () => {
    const inv = invConLana(500);
    const r = descontarLana(inv, { color: "Rojo", marca: "", gramosUsados: 50 });
    assert.equal(r.descontado, 50);
    assert.equal(inv.lanas[0].gramosDisponibles, 450);
});

test("descontarLana: sin coincidencia no descuenta", () => {
    const inv = invConLana(500);
    const r = descontarLana(inv, { color: "Azul", marca: "", gramosUsados: 50 });
    assert.equal(r.descontado, 0);
    assert.equal(r.actualizado, false);
    assert.equal(inv.lanas[0].gramosDisponibles, 500);
});

test("descontarLana: reparte entre varios ovillos y se queda sin stock", () => {
    const inv = invConLana(30);
    agregarLanaInventario(inv, {
        color: "Rojo",
        marca: "Ovillos SA",
        precioOvillo: 1000,
        gramosOvillo: 100,
        gramosDisponibles: 10,
    });
    const r = descontarLana(inv, { color: "Rojo", marca: "", gramosUsados: 100 });
    assert.equal(r.descontado, 40); // solo había 40 g
    assert.equal(inv.lanas[0].gramosDisponibles, 0);
    assert.equal(inv.lanas[1].gramosDisponibles, 0);
});

test("descontarRelleno: descuenta por tipo", () => {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarRellenoInventario(inv, {
        tipo: "Silicona",
        marca: "",
        precioRelleno: 2000,
        gramosRelleno: 1000,
        gramosDisponibles: 800,
    });
    const r = descontarRelleno(inv, { tipo: "Silicona", marca: "", gramosUsados: 100 });
    assert.equal(r.descontado, 100);
    assert.equal(inv.rellenos[0].gramosDisponibles, 700);
});

test("descontarComponentes: coincidencia tolerante de nombre", () => {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarComponenteInventario(inv, {
        tipo: "Ojos de seguridad 12mm",
        cantidadComprada: 100,
        precioCompra: 50,
        cantidadDisponible: 100,
    });
    const r = descontarComponentes(inv, [{ tipo: "ojos", cantidadUtilizada: 2 }]);
    assert.equal(r.actualizado, true);
    assert.equal(inv.componentes[0].cantidadDisponible, 98);
});

test("descontarComponentes: sin componente coincidente no actualiza", () => {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarComponenteInventario(inv, { tipo: "Ojos", cantidadComprada: 10, precioCompra: 50, cantidadDisponible: 10 });
    const r = descontarComponentes(inv, [{ tipo: "Nariz", cantidadUtilizada: 1 }]);
    assert.equal(r.actualizado, false);
    assert.equal(inv.componentes[0].cantidadDisponible, 10);
});

test("guardarInventario / cargarInventario", () => {
    stubLocalStorage();
    const inv = invConLana(500);
    guardarInventario(inv);
    const cargado = cargarInventario();
    assert.equal(cargado.lanas.length, 1);
    assert.equal(cargado.lanas[0].color, "Rojo");
    assert.equal(cargado.lanas[0].gramosDisponibles, 500);
});

test("cargarInventario: sin datos devuelve estructura vacía", () => {
    stubLocalStorage();
    const cargado = cargarInventario();
    assert.deepEqual(cargado, { lanas: [], rellenos: [], componentes: [] });
});

// ---------------------------------------------------------------------------
// Robustez: coincidencia tolerante también en lana y relleno
// ---------------------------------------------------------------------------
test("coincideTexto: iguales o contenidos", () => {
    assert.equal(coincideTexto("ojos", "Ojos de seguridad 12mm"), true);
    assert.equal(coincideTexto("Rojo", "Rojo oscuro"), true);
    assert.equal(coincideTexto("Rojo", "Azul"), false);
    assert.equal(coincideTexto("", "Rojo"), false);
});

test("descontarLana: coincidencia tolerante de color parcial", () => {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarLanaInventario(inv, {
        color: "Rojo oscuro",
        marca: "Drops",
        precioOvillo: 1000,
        gramosOvillo: 100,
        gramosDisponibles: 500,
    });
    const r = descontarLana(inv, { color: "Rojo", marca: "", gramosUsados: 50 });
    assert.equal(r.descontado, 50);
    assert.equal(inv.lanas[0].gramosDisponibles, 450);
});

test("descontarRelleno: coincidencia tolerante de tipo parcial", () => {
    const inv = { lanas: [], rellenos: [], componentes: [] };
    agregarRellenoInventario(inv, {
        tipo: "Fibra siliconada",
        marca: "HobbyFill",
        precioRelleno: 2000,
        gramosRelleno: 1000,
        gramosDisponibles: 800,
    });
    const r = descontarRelleno(inv, { tipo: "siliconada", marca: "", gramosUsados: 100 });
    assert.equal(r.descontado, 100);
    assert.equal(inv.rellenos[0].gramosDisponibles, 700);
});

test("descontarLana: inventario inválido no lanza", () => {
    assert.deepEqual(descontarLana(null, { color: "Rojo", gramosUsados: 10 }), {
        descontado: 0,
        actualizado: false,
    });
    assert.deepEqual(descontarComponentes(undefined, undefined), { actualizado: false });
});

// ---------------------------------------------------------------------------
// Robustez: normalización de inventario importado
// ---------------------------------------------------------------------------
test("normalizarInventario: descarta elementos no válidos", () => {
    const inv = normalizarInventario({
        lanas: [{ color: "Rojo" }, null, "basura", 42],
        rellenos: "no es array",
        componentes: [{ tipo: "Ojos" }],
    });
    assert.equal(inv.lanas.length, 1);
    assert.deepEqual(inv.rellenos, []);
    assert.equal(inv.componentes.length, 1);
    assert.deepEqual(normalizarInventario(null), { lanas: [], rellenos: [], componentes: [] });
});

test("normalizarInventario: asigna id a los materiales que no lo tienen", () => {
    const inv = normalizarInventario({
        lanas: [{ id: "fijo", color: "Rojo" }, { color: "Azul" }],
        rellenos: [],
        componentes: [],
    });
    assert.equal(inv.lanas[0].id, "fijo");
    assert.ok(inv.lanas[1].id);
    assert.notEqual(inv.lanas[1].id, "fijo");
});

test("clasificarStock: sin stock, stock bajo y stock suficiente", () => {
    assert.deepEqual(clasificarStock(0, 100), { clase: "badge-agotado", texto: "Sin stock" });
    assert.deepEqual(clasificarStock(-5, 100), { clase: "badge-agotado", texto: "Sin stock" });
    assert.deepEqual(clasificarStock(10, 100), { clase: "badge-bajo", texto: "Stock bajo" });
    assert.equal(clasificarStock(11, 100), null);
    assert.equal(clasificarStock(50, 0), null);
    assert.deepEqual(clasificarStock(0, 0), { clase: "badge-agotado", texto: "Sin stock" });
});

test("esSeccionValida: acepta sólo las secciones existentes", () => {
    assert.equal(esSeccionValida("inventario"), "inventario");
    assert.equal(esSeccionValida(" otra "), "");
    assert.equal(esSeccionValida(null), "");
    assert.equal(esSeccionValida(undefined), "");
    assert.equal(esSeccionValida("../etc"), "");
});

// ---------------------------------------------------------------------------
// Robustez: cálculos con datos faltantes
// ---------------------------------------------------------------------------
test("calcularTotalComponentes: tolera undefined y elementos nulos", () => {
    assert.equal(calcularTotalComponentes(), 0);
    assert.equal(calcularTotalComponentes(null), 0);
    assert.equal(calcularTotalComponentes([null, { cantidadComprada: 2, precioCompra: 10, cantidadUtilizada: 1 }]), 5);
});

// ---------------------------------------------------------------------------
// Robustez: almacenamiento con errores
// ---------------------------------------------------------------------------
test("leerJson: devuelve el valor por defecto si la clave no existe o está corrupta", () => {
    stubLocalStorage();
    assert.deepEqual(leerJson("no-existe", []), []);
    localStorage.setItem("corrupta", "{ esto no es json");
    assert.equal(leerJson("corrupta", "default"), "default");
});

test("guardarJson: devuelve false y no rompe si falla el guardado", () => {
    stubLocalStorage();
    const original = localStorage.setItem;
    const errores = [];
    const originalError = console.error;
    console.error = () => errores.push(1);
    localStorage.setItem = () => {
        throw new Error("cuota llena");
    };
    const ok = guardarJson("clave", { a: 1 });
    localStorage.setItem = original;
    console.error = originalError;
    assert.equal(ok, false);
    assert.equal(errores.length, 1);
});

test("guardarJson: devuelve true cuando guarda bien", () => {
    stubLocalStorage();
    assert.equal(guardarJson("clave", { a: 1 }), true);
    assert.deepEqual(leerJson("clave"), { a: 1 });
});

test("storageDisponible: true con localStorage funcional", () => {
    stubLocalStorage();
    assert.equal(storageDisponible(), true);
});

// ---------------------------------------------------------------------------
// categorias.js — categorías de componentes editables
// ---------------------------------------------------------------------------
test("normalizarCategorias: defaults, limpieza y formato viejo", () => {
    assert.deepEqual(normalizarCategorias(null), CATEGORIAS_COMPONENTES_POR_DEFECTO);
    assert.deepEqual(normalizarCategorias("basura"), CATEGORIAS_COMPONENTES_POR_DEFECTO);
    assert.deepEqual(normalizarCategorias([" Ojos ", "", "ojos", 42, "Cinta"]), ["Ojos", "Cinta"]);
    assert.deepEqual(normalizarCategorias({ componentes: ["A", "a", "B"] }), ["A", "B"]);
    assert.deepEqual(normalizarCategorias([]), []);
    assert.deepEqual(normalizarListaCategorias("no es array"), []);
});

test("agregarCategoria: valida vacío y duplicados sin distinguir mayúsculas", () => {
    assert.equal(agregarCategoria(["Ojos"], "   ").ok, false);
    assert.equal(agregarCategoria(["Ojos"], "ojos").ok, false);

    const r = agregarCategoria(["Ojos"], " Cinta ");
    assert.equal(r.ok, true);
    assert.deepEqual(r.lista, ["Ojos", "Cinta"]);
    // No muta la lista original
    assert.deepEqual(agregarCategoria(["Ojos"], "Cinta").lista, ["Ojos", "Cinta"]);
});

test("renombrarCategoria / eliminarCategoria", () => {
    const r = renombrarCategoria(["Ojos", "Cinta"], 0, "Ojos de seguridad");
    assert.equal(r.ok, true);
    assert.deepEqual(r.lista, ["Ojos de seguridad", "Cinta"]);

    // Permite guardar el mismo nombre en el mismo índice
    assert.equal(renombrarCategoria(["Ojos"], 0, "ojos").ok, true);
    // Y rechaza duplicados en otro índice o índices inválidos
    assert.equal(renombrarCategoria(["Ojos", "Cinta"], 0, "cinta").ok, false);
    assert.equal(renombrarCategoria(["Ojos"], 5, "X").ok, false);

    assert.deepEqual(eliminarCategoria(["A", "B", "C"], 1), ["A", "C"]);
    assert.deepEqual(eliminarCategoria(null, 0), []);
});

test("guardarCategorias / cargarCategorias: ida y vuelta (incluye lista vacía)", () => {
    stubLocalStorage();
    guardarCategorias(["Ojos", " ojos ", "Cinta"]);
    assert.deepEqual(cargarCategorias(), ["Ojos", "Cinta"]);

    guardarCategorias([]);
    assert.deepEqual(cargarCategorias(), []);

    localStorage.setItem("calc-amigurumis-categorias-componentes-v1", "{ roto");
    assert.deepEqual(cargarCategorias(), CATEGORIAS_COMPONENTES_POR_DEFECTO);
});
