# 🧶 Calculadora de Amigurumis

Aplicación web (instalable como PWA) para calcular el costo de amigurumis (lana, relleno,
componentes y mano de obra), guardar patrones, planificar proyectos y administrar el inventario.

## Características

- **Calculadora**: costo de lana, relleno, componentes y mano de obra + total automático.
- **Precio de venta**: margen de ganancia (%) o precio manual (el manual tiene prioridad).
- **Inventario**: lanas, rellenos y componentes con stock disponible.
- **Descuento de stock**: al presionar _Calcular_ (con confirmación) se descuenta del inventario.
- **Planificador de proyectos**: secciones (puntos, vueltas, altura, notas), estado (planificando/terminado).
- **Patrones**: código legible `PAT-0001`, materiales estructurados, búsqueda por nombre/código y
  chips por categoría (mapeo). Se puede crear un proyecto a partir de un patrón.
- **Backup**: exportar/importar todo (inventario + proyectos + patrones) en JSON.
- **PWA**: instalable en PC y Android, funciona sin conexión.
- **Robustez**: guardado a prueba de fallos (avisa si el almacenamiento está lleno o bloqueado),
  sin descuentos de stock duplicados, avisos globales ante errores inesperados.
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
│   └── styles.css          # Estilos (tema rosa)
├── js/
│   ├── calculos.js         # Lógica pura de cálculos (sin DOM)
│   ├── ui.js               # Helpers de render de la interfaz
│   ├── inventario.js       # Inventario + descuento de stock (datos)
│   ├── planificador.js     # Proyectos y patrones (datos + persistencia)
│   ├── utils.js            # Utilidades de DOM y formato
│   ├── estado.js           # Estado en memoria + configuración
│   ├── calculadora.js      # Sección Calculadora
│   ├── inventario-ui.js    # Sección Inventario
│   ├── planificador-ui.js  # Sección Planificador
│   ├── patrones-ui.js      # Sección Patrones
│   ├── backup.js           # Exportar/importar todo
│   ├── almacenamiento.js   # localStorage con manejo de errores
│   ├── render.js           # renderAll()
│   ├── pwa.js              # Registro del Service Worker
│   └── scripts.js          # Punto de entrada
├── public/                 # Assets estáticos (manifest, service worker, iconos)
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

| Clave                           | Contenido                              |
| ------------------------------- | -------------------------------------- |
| `calc-amigurumis-inventario-v1` | Lanas, rellenos y componentes.         |
| `calc-amigurumis-proyectos-v2`  | Proyectos (planificando/terminados).   |
| `calc-amigurumis-patrones-v2`   | Patrones con código `PAT-000x`.        |
| `calc-amigurumis-config-v1`     | Configuración (último valor por hora). |

## Estado actual

Ver [`ROADMAP.md`](./ROADMAP.md). Resumen:

- ✅ Bloques 0, 1, 2 y 3 (base, calculadora, features, persistencia).
- ✅ Inventario, proyectos y patrones con búsqueda y mapeo.
- ✅ PWA instalable (manifest + service worker + iconos).
- ✅ Bloque R: robustez y manejo de errores.
- ⬜ Bloques 4-7: pulido de UI, backup avanzado y empaquetado nativo (Capacitor).
