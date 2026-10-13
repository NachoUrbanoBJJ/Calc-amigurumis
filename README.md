# Calculadora de Amigurumis

Calculadora de costos para amigurumis (lana, relleno, componentes y mano de obra).

## Características

- Cálculo de costo de lanas (precio por gramo usado)
- Cálculo de costo de relleno (precio por gramo usado)
- Gestión de componentes con desglose de costo
- Cálculo de mano de obra
- Total general automático
- Validaciones de entrada
- Responsive (mobile-first)
- Módulos ES6 organizados

## Estructura del proyecto

```
Calc-amigurumis/
├── css/
│   └── styles.css
├── js/
│   ├── calculos.js      # Lógica pura de cálculos
│   ├── ui.js            # Funciones de interfaz
│   ├── scripts.js       # Lógica principal
│   ├── inventario.js    # Gestión de inventario (próximas funcionalidades)
│   ├── patrones.js      # Gestión de patrones (próximas funcionalidades)
│   └── proyectos.js     # Gestión de proyectos (próximas funcionalidades)
├── index.html
├── package.json
├── ROADMAP.md
└── vite.config.js (opcional)
```

## Instalación y uso

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview
npm run preview
```

## Estado actual

- ✅ Bloque 0: Estructura base, Git, Vite, README, ROADMAP
- ✅ Bloque 1: Lógica completa con resultados, validaciones y módulos
- 🔄 Bloque 4: Responsive (parcialmente implementado)

## Próximos pasos

Según el ROADMAP:
1. Mejorar UI/UX (Bloque 4 completo)
2. Persistencia localStorage (Bloque 3)
3. PWA + Capacitor para Android (Bloques 5-6)
4. Inventario, Patrones, Planificador de trabajos (Bloque 2)