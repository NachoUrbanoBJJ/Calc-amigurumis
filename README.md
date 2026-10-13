# 🧶 Calculadora de Amigurumis

Aplicación para calcular el costo real de un amigurumi: lana, relleno, componentes y mano de obra.

El objetivo final es tener una app usable en **PC y Android** (PWA + Capacitor) a partir de un
único código web.

## Estado

En desarrollo. Fase actual: **Bloque 0 — Orden del proyecto** (ver [`ROADMAP.md`](./ROADMAP.md)).

## Estructura del proyecto

```
Calcuadora/
├─ index.html        # Estructura de la interfaz
├─ css/
│  └─ styles.css     # Estilos
├─ js/
│  └─ scripts.js     # Lógica de la calculadora
├─ assets/           # Íconos e imágenes (se agregan en el Bloque 5)
├─ package.json      # Dependencias y scripts (Vite)
├─ ROADMAP.md        # Hoja de ruta por bloques
└─ README.md
```

## Requisitos

- **Navegador** (para la versión simple): solo abrir `index.html`.
- **Node.js 18+** (para el servidor de desarrollo con Vite y para Capacitor más adelante).
  Descarga: https://nodejs.org
- **Git** para el control de versiones.

## Cómo usarla

### Opción 1 — Sin instalar nada
Abrir `index.html` en el navegador (doble clic). Funciona de forma básica.

### Opción 2 — Servidor de desarrollo (recomendado)
Requiere Node.js instalado.

```bash
npm install    # solo la primera vez
npm run dev    # abre un servidor local con recarga automática
```

Para generar la versión de producción:

```bash
npm run build
```

## Hoja de ruta

El plan completo, dividido en bloques que se pueden ampliar con el tiempo, está en
[`ROADMAP.md`](./ROADMAP.md).
