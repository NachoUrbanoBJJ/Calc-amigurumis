# 🧶 Calculadora de Amigurumis

Aplicación web (instalable como PWA) para calcular el costo de amigurumis (lana, relleno,
componentes y mano de obra), guardar patrones, planificar proyectos y administrar el inventario.

## Características

- **Calculadora**: costo de lana, relleno, componentes y mano de obra + total automático.
- **Valor por hora y margen opcionales**: si no cargás el valor por hora, el cálculo se hace igual y
  la mano de obra queda fuera del total (con un aviso claro).
- **Precio ideal sugerido**: siempre se muestra “Precio ideal (+50 %)”, calculado sobre lo gastado y
  usado (costo total + 50 %), aunque no cargues margen ni precio.
- **Precio de venta**: margen de ganancia (%) o precio manual (el manual tiene prioridad).
- **Duplicar proyectos**: crea una copia independiente (nuevo id, secciones y fechas) al instante.
- **Exportar**: cada proyecto y patrón se puede descargar en **PDF** (vista de impresión), **CSV**
  (compatible con Excel es-AR) y **PNG** (resumen en imagen).
- **Escalar por tamaño**: cargás un modelo base (tamaño, lana, relleno y horas) y el tamaño
  deseado; la app estima el material y las horas (lana ~altura², relleno ~altura²·³, horas
  ~altura^1,7) y podés aplicarlos al formulario.
- **Inventario**: lanas, rellenos y componentes con stock disponible; se pueden **editar y eliminar**.
- **Alertas de stock**: cada material muestra `Sin stock` / `Stock bajo` y hay un resumen arriba.
- **Descuento de stock**: al presionar _Calcular_ (con confirmación) se descuenta del inventario;
  si no alcanza, avisa cuánto faltó.
- **Componentes de la calculadora**: se pueden agregar, **editar y eliminar** antes de calcular.
- **Categorías editables**: las categorías de componentes se administran desde Inventario (agregar,
  editar, eliminar) y alimentan la calculadora y las sugerencias del inventario.
- **Planificador de proyectos**: secciones (puntos, vueltas, altura, notas), estado (planificando/terminado).
- **Patrones**: código legible `PAT-0001`, materiales estructurados, búsqueda por nombre/código y
  chips por categoría (mapeo). Se puede crear un proyecto a partir de un patrón.
- **Backup**: exportar/importar todo (inventario + proyectos + patrones + categorías) en JSON.
- **PWA**: instalable en PC y Android, funciona sin conexión.
- **Robustez**: guardado a prueba de fallos (avisa si el almacenamiento está lleno o bloqueado),
  sin descuentos de stock duplicados, avisos globales ante errores inesperados.
- **UX**: diálogos propios (no `alert`/`confirm` del navegador) y la app recuerda la última sección.
- **Accesibilidad y diseño**: foco visible, enlace “Saltar al contenido”, `aria-current` en la
  navegación, etiquetas en todos los campos, teclado numérico en móvil (`inputmode`), controles de
  44 px, contraste AA y **tema claro / oscuro / automático** (botón en el encabezado).
- **Estética cozy**: look “cuaderno / diario tejido” (papel cuadriculado, tarjetas con cinta adhesiva y
  esquinas irregulares, subrayado dibujado a mano). Tipografías locales (funcionan sin conexión):
  **Lora** para títulos, **Caveat** para acentos manuscritos y **Nunito Sans** para el cuerpo.
- **Impresión**: estilos propios para que el PDF salga limpio (sin menús ni botones).
- Moneda en **pesos argentinos (ARS)**. Validaciones de entrada y escapado de HTML.

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (probado con Node 24).

## Instalación y uso

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción (genera dist/)
npm run build

# Previsualizar la build
npm run preview
```

> ⚠️ No abras `index.html` haciendo doble clic: usa `npm run dev` (o la build servida), porque la
> app usa módulos ES y un Service Worker.

## Scripts

| Script                 | Descripción                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con recarga en vivo. |
| `npm run build`        | Build de producción en `dist/`.             |
| `npm run preview`      | Sirve la build de `dist/`.                  |
| `npm test`             | Tests unitarios (runner nativo de Node).    |
| `npm run lint`         | Analiza el código con ESLint.               |
| `npm run lint:fix`     | ESLint con arreglos automáticos.            |
| `npm run format`       | Formatea con Prettier.                      |
| `npm run format:check` | Verifica el formato sin modificar.          |
| `npm run icons`        | Regenera los iconos de la PWA en `public/`. |

## Estructura del proyecto

```
Calcuadora/
├── css/
│   └── styles.css          # Sistema de diseño cozy (tokens, temas claro/oscuro, print)
├── js/
│   ├── calculos.js         # Lógica pura de cálculos (sin DOM)
│   ├── ui.js               # Helpers de render de la interfaz
│   ├── inventario.js       # Inventario + descuento de stock (datos)
│   ├── categorias.js       # Categorías de componentes (datos + persistencia)
│   ├── planificador.js     # Proyectos y patrones (datos + persistencia)
│   ├── exportar.js         # Exportación a CSV, PDF (impresión) y PNG (canvas)
│   ├── tema.js             # Tema claro / oscuro / automático
│   ├── utils.js            # Utilidades de DOM y formato
│   ├── estado.js           # Estado en memoria + configuración
│   ├── calculadora.js      # Sección Calculadora
│   ├── inventario-ui.js    # Sección Inventario
│   ├── categorias-ui.js    # Administración de categorías
│   ├── planificador-ui.js  # Sección Planificador
│   ├── patrones-ui.js      # Sección Patrones
│   ├── backup.js           # Exportar/importar todo
│   ├── almacenamiento.js   # localStorage con manejo de errores
│   ├── render.js           # renderAll()
│   ├── pwa.js              # Registro del Service Worker
│   └── scripts.js          # Punto de entrada
├── public/                 # Assets estáticos (manifest, service worker, iconos)
│   └── fuentes/            # Tipografías locales (Lora, Caveat, Nunito Sans)
├── scripts/
│   └── generate-icons.mjs  # Generador de iconos
├── tests/
│   └── unit.test.js        # Tests unitarios
├── index.html
├── eslint.config.js
├── .prettierrc.json
├── package.json
└── ROADMAP.md
```

## Persistencia (localStorage)

| Clave                                       | Contenido                                                     |
| ------------------------------------------- | ------------------------------------------------------------- |
| `calc-amigurumis-inventario-v1`             | Lanas, rellenos y componentes.                                |
| `calc-amigurumis-proyectos-v2`              | Proyectos (planificando/terminados).                          |
| `calc-amigurumis-patrones-v2`               | Patrones con código `PAT-000x`.                               |
| `calc-amigurumis-config-v1`                 | Configuración (tema, último valor por hora + última sección). |
| `calc-amigurumis-categorias-componentes-v1` | Categorías de componentes.                                    |

## Estado actual

Ver [`ROADMAP.md`](./ROADMAP.md). Resumen:

- ✅ Bloques 0, 1, **2 completo** y 3 (base, calculadora, features, persistencia).
- ✅ Inventario, proyectos y patrones con búsqueda y mapeo.
- ✅ PWA instalable (manifest + service worker + iconos).
- ✅ Bloque R: robustez y manejo de errores.
- ✅ Bloque U: modales propios, CRUD de inventario/componentes, avisos de stock y memoria de sección.
- ✅ Bloque 2b: categorías de componentes editables (calculadora + inventario + backup).
- ✅ Bloque 4: diseño cozy (cuaderno/diario tejido, tipografías locales), contraste AA, modo
  oscuro, accesibilidad, impresión y mejoras móviles.
- ✅ Bloque QA: auditoría funcional completa (cálculos, guardado, stock, exportación, backup)
  y contraste de precios contra el mercado real argentino.
- ✅ Bloque S: escalado por tamaño (lana por superficie, relleno por volumen, horas por puntos).
- ⬜ Bloques 5-7: backup avanzado (v4 + recordatorios), sincronización y empaquetado nativo
  (Capacitor).

## Precios y mercado (referencia)

Con datos reales de Argentina (octubre 2026), un amigurumi de 17–22 cm con ~5 h de
trabajo tiene un **costo total de $23.000–$28.000** y un **precio ideal (+50 %) de
$35.000–$42.000**, que cae dentro del **rango real de mercado ($8.000–$45.900, mediana
≈ $28.000)**. El valor hora de referencia del rubro textil es **$3.231–$3.739/h**
(convenio AOT-FITA); para trabajo artesanal a medida conviene **$4.000–$4.500/h**.

> Si no cargás el valor hora, la calculadora **no** suma mano de obra y te avisa: el
> resultado queda por debajo del mercado y estarías regalando tu trabajo.
