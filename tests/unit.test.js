import { test } from "node:test";
import assert from "node:assert/strict";

import {
    calcularLana,
    calcularRelleno,
    calcularManoObra,
    calcularComponente,
    calcularTotalComponentes,
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
} from "../js/inventario.js";

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
    assert.ok(Array.isArray(p.secciones));
    assert.ok(p.id);

    const conTotal = normalizarProyecto({ costo: { total: 100 } });
    assert.equal(conTotal.estado, "terminado");
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
