# 🧶 Hoja de Ruta — Calculadora de Amigurumis

Cada bloque es independiente y se puede ampliar sin romper los demás.
Leyenda: ✅ hecho · ⬜ pendiente · 🔄 en progreso

---

## Bloque 0 — Orden del proyecto (base) ✅

- ✅ Estructura de carpetas (`css/`, `js/`, `assets/`)
- ✅ Repositorio **Git** (local)
- ✅ **`package.json`** + **Vite**
- ✅ `README.md` con instrucciones
- ✅ `ROADMAP.md`
- ✅ Repositorio remoto en **GitHub** (`NachoUrbanoBJJ/Calc-amigurumis`, rama `main`)
- ✅ JS separado en módulos por sección

## Bloque 1 — Lógica de la calculadora 🔴 prioridad ✅

- ✅ Captura de Lanas, Relleno, Componentes, Mano de Obra
- ✅ Cálculo de costo de lana, relleno y mano de obra
- ✅ Mostrar los resultados en pantalla
- ✅ Total general del amigurumi
- ✅ Lista visible de componentes agregados
- ✅ Botón "Calcular" único
- ✅ Validaciones (campos vacíos, negativos, división por cero)
- ✅ Errores inline (`#erroresCalculadora`)

## Bloque 2 — Funciones de la app (features) ✅

- ✅ Precio de venta final + margen de ganancia (%) — el margen y el precio son **opcionales**
- ✅ **Precio ideal sugerido (+50 %)** sobre lo gastado y usado, siempre visible
- ✅ **Valor por hora opcional**: sin él, el cálculo se hace y la mano de obra queda fuera (con aviso)
- ✅ Guardar varias recetas/proyectos
- ✅ Historial de amigurumis calculados (los cálculos guardados quedan como proyectos con fecha y costo)
- ✅ Categorías de componentes editables (agregar, renombrar y eliminar; se usan en la calculadora y como sugerencias del inventario)
- ✅ **Duplicar un proyecto** (copia independiente: nuevo id, secciones y fechas)
- ✅ Notas por proyecto
- ✅ **Gestor de patrones de amigurumi** (código `PAT-000x`, materiales estructurados, búsqueda, chips por categoría)
- ✅ **Inventario de materiales (lanas, relleno, componentes)**
- ✅ **Planificador de trabajos (proyecto + secciones: puntos/vueltas/altura/notas)**
- ✅ **Descontar stock al calcular (con confirmación)**
- ✅ **Alertas de stock bajo / sin stock** (badge en cada material + resumen del inventario)
- ✅ **Editar y eliminar materiales del inventario**
- ✅ **Editar y eliminar componentes de la calculadora**
- ✅ **Menú de navegación (Calculadora / Inventario / Planificador / Patrones / Backup)**
- ✅ **Exportar/Importar Backup JSON (global)**
- ✅ **Exportar/Importar Inventario JSON**
- ✅ **Crear proyecto a partir de un patrón**
- ✅ **Exportar proyectos y patrones a PDF, CSV (Excel) y PNG**

## Bloque 3 — Datos y persistencia ✅

- ✅ Guardar en el dispositivo (localStorage)
- ✅ Datos por defecto (config: último valor por hora)
- ✅ Exportar/Importar backup (JSON)
- ✅ **Base de datos local unificada (proyectos + inventario + patrones)**
- ✅ **Sincronización de stock entre proyectos e inventario**
- ⬜ Futuro: sincronización en la nube

## Bloque 4 — Diseño y experiencia (UI/UX) ✅

- ✅ Paleta rosa/blanco y tarjetas (tonos ajustados para contraste AA)
- ✅ Responsive real (tarjetas con max-width + flex/grid)
- ✅ Diseño mobile-first (base móvil + media queries de mejora)
- ✅ Ajustes de tipografía y espaciado (tokens: tipos, espaciado, radios, sombras)
- ✅ Feedback visual (errores inline, confirmaciones, avisos)
- ✅ Botones/inputs cómodos para uso táctil (**44 px** mínimo, `inputmode` para el teclado numérico)
- ✅ **Modo oscuro** (automático según el sistema + botón claro/oscuro/automático persistido)
- ✅ Accesibilidad: foco visible, enlace “Saltar al contenido”, `aria-current`, etiquetas en todos
  los campos, `aria-live` en resultados y avisos, foco atrapado y restaurado en los modales
- ✅ **Estilos de impresión** para exportar a PDF sin menús ni botones

## Bloque 5 — PWA (PC + Android desde navegador) ✅

- ✅ `manifest.webmanifest`
- ✅ Íconos (192px, 512px, maskable y SVG)
- ✅ Service Worker (offline, cache-first con revalidación)
- ✅ Instalable en PC y Android
- ✅ Meta tags correctos (título, theme-color, apple-touch-icon)

## Bloque C — Prolijidad de código ✅

- ✅ `scripts.js` dividido en módulos por sección (`utils`, `estado`, `calculadora`,
  `inventario-ui`, `planificador-ui`, `patrones-ui`, `backup`, `render`, `pwa`)
- ✅ **ESLint** (flat config) + **Prettier** configurados
- ✅ **Tests unitarios** de la lógica pura (`npm test`, runner nativo de Node)
- ✅ `package-lock.json` versionado
- ✅ README y ROADMAP actualizados

## Bloque R — Robustez y manejo de errores ✅

- ✅ Capa de almacenamiento (`almacenamiento.js`): lectura/escritura segura, detecta
  almacenamiento no disponible y **avisa** si falla un guardado (cuota llena / modo privado)
- ✅ Aviso global no bloqueante (`#avisoGlobal`) + manejador de errores temprano y
  `unhandledrejection` (una excepción ya no deja la pantalla congelada en silencio)
- ✅ Ayudantes de DOM a prueba de fallos (`num`/`texto`/`valor` devuelven `""` en vez de lanzar)
- ✅ **Sin doble descuento de stock**: apretar _Calcular_ dos veces no descuenta de nuevo
- ✅ **Coincidencia unificada** (tolerante) entre disponibilidad de patrones y descuento de lana/relleno
- ✅ Import de backup arreglado: las listas vacías **sí** borran datos; se resetean los formularios
- ✅ Validación/descarte de datos corruptos (`esObjeto`, `normalizarInventario`)
- ✅ Comparación de números con tolerancia (detección de duplicados con decimales)
- ✅ Fechas inválidas muestran `-` en vez de "Invalid Date"
- ✅ Tests ampliados (51 en total)

## Bloque U — UX y funcionalidad (modales + CRUD) ✅

- ✅ **Modales propios** en lugar de `alert()` / `confirm()` del navegador (Promise + teclado:
  Enter acepta, Esc cancela; arreglos multilínea; fallback a los nativos si falta el DOM)
- ✅ **Recordar la última sección** visitada al recargar (se guarda en la config)
- ✅ **Inventario editable**: editar y eliminar lanas, rellenos y componentes (con confirmación
  y conservando IDs estables); los materiales importados sin ID reciben uno automáticamente
- ✅ **Componentes de la calculadora editables**: editar (carga el formulario y guarda en la
  misma fila) y eliminar con confirmación
- ✅ **Avisos de stock**: badges `Sin stock` / `Stock bajo` y resumen arriba del inventario
- ✅ **Descuento de stock transparente**: si no alcanza, avisa cuánto faltó
- ✅ Botones de cancelar edición y nombres de acción coherentes en todos los formularios
- ✅ Tests ampliados (**51 en total**: incluye exportaciones CSV, duplicado e importes ideales)

## Bloque 2b — Categorías editables ✅

- ✅ **Categorías de componentes administrables** desde Inventario: agregar, editar y eliminar
  (con confirmación). Se guardan en `calc-amigurumis-categorias-componentes-v1`.
- ✅ El `<select>` de la calculadora se arma solo con esas categorías y conserva la opción elegida
  al agregar o editar una categoría.
- ✅ Sugerencias (`datalist`) en el alta de componentes del inventario, sin bloquear texto libre.
- ✅ Borrar una categoría **no** modifica los materiales que ya la usan.
- ✅ Las categorías entran en el backup completo (export/import; compatible con backups viejos).

## Bloque 6 — App Android nativa (Capacitor) 📱

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
- ⬜ **Recomendaciones automáticas por stock disponible**

---

## Orden sugerido de ejecución

```
Bloque 0 → Bloque 1 → Bloque 4 (responsive/UI + modo oscuro) → Bloque 3 → Bloque 5 (PWA) →
Bloque C (prolijidad) → Bloque R (robustez) → Bloque U (UX + CRUD) →
Bloque 2 completo (features + exportaciones) → Bloque 6 (Capacitor) → Bloque 7 (tienda)
```

Primero que funcione (0–1), después que se vea bien (4), que no pierda datos (3),
que sea instalable (5), que el código esté prolijo (C), que no falle ni incomode (R/U),
y luego features (2), nativo (6) y tienda (7).
