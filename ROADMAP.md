# 🧶 Hoja de Ruta — Calculadora de Amigurumis

Cada bloque es independiente y se puede ampliar sin romper los demás.
Leyenda: ✅ hecho · ⬜ pendiente · 🔄 en progreso

---

## Bloque 0 — Orden del proyecto (base) ✅
- ✅ Estructura de carpetas (`css/`, `js/`, `assets/`)
- ✅ Repositorio **Git** (local)
- ✅ **`package.json`** + **Vite** (preparado)
- ✅ `README.md` con instrucciones
- ✅ `ROADMAP.md`
- ⏳ Repositorio remoto en **GitHub** (ejecutar `push`)
- ⬜ Separar el JS en módulos por sección (se hará junto al Bloque 1)

## Bloque 1 — Lógica de la calculadora 🔴 prioridad
- ✅ Captura de Lanas, Relleno, Componentes, Mano de Obra
- ✅ Cálculo de costo de lana, relleno y mano de obra (en consola)
- ⬜ Mostrar los resultados en pantalla
- ⬜ Total general del amigurumi
- ⬜ Lista visible de componentes agregados
- ⬜ Botón "Calcular" único o cálculo en vivo
- ⬜ Validaciones (campos vacíos, negativos, división por cero)

## Bloque 2 — Funciones de la app (features)
- ⬜ Precio de venta final + margen de ganancia (%)
- ⬜ Guardar varias recetas/proyectos
- ⬜ Historial de amigurumis calculados
- ⬜ Categorías de componentes editables por el usuario
- ⬜ Duplicar un proyecto
- ⬜ Notas por proyecto
- ⬜ Futuro: exportar a PDF / imagen / Excel

## Bloque 3 — Datos y persistencia
- ⬜ Guardar en el dispositivo (localStorage)
- ⬜ Datos por defecto (categorías, valores)
- ⬜ Exportar/Importar backup (JSON)
- ⬜ Futuro: sincronización en la nube

## Bloque 4 — Diseño y experiencia (UI/UX)
- ✅ Paleta rosa/blanco y tarjetas
- ⬜ Responsive real (hoy usa 1200px fijo)
- ⬜ Diseño mobile-first
- ⬜ Ajustes de tipografía y espaciado
- ⬜ Feedback visual (errores, confirmaciones, animaciones)
- ⬜ Botones/inputs cómodos para uso táctil
- ⬜ Futuro: modo oscuro

## Bloque 5 — PWA (PC + Android desde navegador)
- ⬜ manifest.json
- ⬜ Íconos (192px y 512px) + splash screen
- ⬜ Service Worker (offline)
- ⬜ Instalable en PC y Android
- ⬜ Meta tags correctos (título, theme-color)

## Bloque 6 — App Android nativa (Capacitor) 📱
- ⬜ Instalar Node.js
- ⬜ Instalar Android Studio + JDK
- ⬜ Agregar Capacitor al proyecto
- ⬜ Generar proyecto Android
- ⬜ Ícono y splash nativos
- ⬜ Compilar APK de prueba
- ⬜ Compilar AAB firmado
- ⬜ Probar en el celular

## Bloque 7 — Publicación en Play Store (opcional)
- ⬜ Cuenta Google Play Developer ($25 único)
- ⬜ Política de privacidad (URL pública)
- ⬜ Ficha de tienda (descripción, capturas, gráfico)
- ⬜ Seguridad de datos + clasificación de contenido
- ⬜ Test cerrado: 12 testers por 14 días
- ⬜ Solicitar producción y publicar

## Bloque 8 — Expansión
- ⬜ Versión iOS
- ⬜ Versión de escritorio (Windows)
- ⬜ Compartir cálculos por WhatsApp
- ⬜ Lista de precios de lanas/insumos
- ⬜ Estadísticas (ganancias del mes, etc.)

---

## Orden sugerido de ejecución

```
Bloque 0 → Bloque 1 → Bloque 4 (responsive) → Bloque 3 → Bloque 5 → Bloque 6 → Bloque 2 (extras) → Bloque 7
```

Primero que funcione (0–1), después que se vea bien (4), que no pierda datos (3),
que sea instalable (5–6), y luego features (2) y tienda (7).
