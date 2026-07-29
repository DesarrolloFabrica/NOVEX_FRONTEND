# NOVEX — Dirección de Arte: estado actual

> Referencia de la capa visual implementada en el Centro de Monitoreo.
> Solo documenta **presentación** (Tailwind, composición, constantes visuales). No describe lógica de negocio.
>
> Última actualización: **30 jun 2026** — incluye Fases 4–8.1 (material, ambiente, jerarquía, identidad de áreas, escala cinematográfica).

Stack visual: **React + TypeScript + Tailwind CSS v4**. Animaciones de microactividad en `src/index.css`.

---

## 1. Arquitectura de Sala

La experiencia se compone en capas físicas anidadas, montadas en `MonitoringPage`:

```
NovexRoom          → escenario exterior (fondo, profundidad, viñeta)
  NovexFrame       → marco metálico de gran pantalla operativa
    MainScreen     → Cristal Maestro (lámina técnica)
      ScreenDeck   → cabecera + deck operativo
        MonitoringLayout → rejilla grabada + overlay de proyección
```

| Componente | Ruta | Responsabilidad |
|---|---|---|
| `NovexRoom` | `src/modules/room/components/NovexRoom.tsx` | Suelo, profundidad radial, iluminación ambiental reactiva |
| `NovexFrame` | `src/modules/room/components/NovexFrame.tsx` | Chasis metálico, bisel, sombra proyectada |
| `MainScreen` | `src/modules/room/components/MainScreen.tsx` | Lámina de cristal con material estratificado |
| `ScreenDeck` | `src/modules/monitoring/components/ScreenDeck.tsx` | Cabecera incrustada y región operativa |
| `MonitoringLayout` | `src/modules/monitoring/components/MonitoringLayout.tsx` | Rejilla de estaciones + overlay del holograma |
| `MonitoringCenter` | `src/modules/monitoring/components/MonitoringCenter.tsx` | Orquestación visual (sin lógica de negocio) |

**Tokens de escenario:** `src/modules/room/constants/roomTheme.ts`  
**Escala de planos (z-index):** `src/modules/monitoring/constants/visualPlanes.ts`

En **desktop** la cadena flex (`roomStageFill` → `frameStageFill` → `mainScreenFill` → `SCREEN_DECK` → `CRYSTAL_GRID`) ocupa `100dvh` sin scroll vertical. En **móvil/tablet** se permite scroll cuando el contenido lo requiere.

---

## 2. Cristal Maestro

El Cristal Maestro es la superficie operativa principal: una lámina técnica fría, opaca y estratificada — no glassmorphism ni panel web flotante.

**Implementación:**
- Material base y capas: `crystalMaterial.ts` + `CrystalMaterial.tsx`
- Estructura (losa, rieles, surcos, esquinas): `CrystalStructure.tsx`
- Contenido grabado en el plano 3 (`PLANE_ETCHED`): consola, módulos, paneles laterales
- Rejilla desktop: columnas laterales 15–18 rem, centro flexible (`CRYSTAL_GRID` en `monitoringTheme.ts`)

**Lectura visual:** surcos mecanizados entre estaciones, velos radiales locales, divisores grabados (no bordes de tarjeta). El contenido se siente *inscrito* en la lámina, no superpuesto.

---

## 3. Sistema de Proyección

Capa delante del cristal (planos 4–5) que comunica el expediente activo.

| Elemento | Componente | Tokens |
|---|---|---|
| Overlay de posición | `MonitoringLayout` | `PROJECTION_OVERLAY` |
| Contenedor unificado | `ProjectionPlatform` + `CommitmentHologram` | `PROJECTION_SYSTEM` |
| Volumen holográfico | `CommitmentHologram` | `PROJECTION_SURFACE_*`, `visualPlanes` |

**Comportamiento responsive:**
- **Desktop:** overlay absoluto en la parte inferior del cristal; el layout no reserva altura extra (`pointer-events-none` en contenedor, eventos en hijos).
- **Móvil/tablet:** flujo normal debajo del cristal para usabilidad.

El holograma es la fuente de verdad visual del compromiso seleccionado (detalle, validación, historial compacto).

---

## 4. Plataforma

Infraestructura mecánica **permanente** bajo el holograma: mesa de aleación oscura, núcleo emisor, tallo de acople y rieles laterales.

- Componente: `ProjectionPlatform.tsx`
- Tokens: `projectionTheme.ts` + `materialTheme.ts` (cuerpo mecánico, emisor, biseles)
- Estados: **idle** (reposo, presencia sutil) y **active** (expediente proyectado, acento índigo)
- En desktop la plataforma es compacta (`lg:h-2` en deck, emisor `lg:h-6`) para caber sin scroll

La plataforma no desaparece sin selección: ancla físicamente el origen de la proyección.

---

## 5. Materiales

Separación explícita de materiales (Sprint 4.4) en `materialTheme.ts`:

| Plano | Material | Lectura |
|---|---|---|
| Marco | Metálico sólido, opaco | Chasis pesado, bisel frío |
| Cristal | Lámina laminada técnica | Fría, con espesor y borde de lámina |
| Grabado | Micro-hundimiento en superficie | Estaciones y surcos fresados |
| Plataforma | Mecánica mate | Aleación oscura, emisor mecánico |
| Holograma | Volumen luminoso proyectado | Translúcido, brillo interno, sin caja sólida |

Cada material tiene tokens propios de sombra, gradiente y bisel. No se mezclan lecturas (p. ej. el marco no usa transparencias de cristal).

---

## 6. Sistema Ambiental

Iluminación direccional reactiva al estado operativo del área (Sprint 5.1).

- Mapa de estados: `operationalRoomState.ts` (`neutral`, `healthy`, `attention`, `risk`, `critical`)
- Consumo: `NovexRoom`, `NovexFrame`, `MainScreen`, `ScreenDeck`, consolas, paneles, plataforma
- Principio: **la Sala comunica el estado del área; el Holograma comunica el expediente**
- No son overlays planos de color: gradientes direccionales en fondo, bisel del marco, tinte del cristal, pools de luz en estaciones y rieles de plataforma
- Transiciones: `ambientLighting.ts` (`AMBIENT_LIGHT_TRANSITION`, ~700 ms)

El entorno se deriva de `areaHealth.environment` en `MonitoringPage` y se propaga como `environment` / `RoomEnvironment` sin que los componentes de sala calculen negocio.

---

## 7. Microactividad

Respiración institucional mínima (Sprint 5.2) — solo CSS, sin alterar contenido ni datos.

- Clases: `operationalBreathing.ts`
- Keyframes: `src/index.css` (ciclos 11–18 s, desincronizados)
- Ámbitos: sala, marco, cristal, plataforma, material del holograma (no el texto del expediente)
- Accesibilidad: `@media (prefers-reduced-motion: reduce)` desactiva todas las animaciones `novex-breath-*`

---

## 8. Identidad de Áreas

Señales institucionales mínimas por área (Sprint 7.1), sin catálogo de colores por dominio.

- Mapa: `areaIdentity.ts` — monograma, variante de glifo geométrico (CSS), patrón lineal inferior
- Componente: `AreaModuleIdentity.tsx`, integrado en `AreaFocusStrip.tsx`
- El **estado operativo** (`theme.dot`, salud del área) sigue siendo el acento principal; la identidad complementa código y nombre

Tonos neutros (slate). No compiten con la jerarquía del holograma ni con alertas críticas.

---

## 9. Jerarquía visual

Recorrido del operador (Sprint 6.1) en `visualHierarchy.ts`:

```
Holograma → Consola → Módulos → Inteligencia → Contexto → Header
```

Se controla con peso tipográfico, opacidad y contraste — no con nuevos contenedores. El holograma concentra el máximo peso; header y contexto son los planos más tenues.

---

## 10. Pulido de escala (Fase 8.1)

Objetivo: recuperar presencia cinematográfica en desktop **sin scroll vertical** ni zoom CSS global.

**Cambios aplicados:**
- Sala a ancho completo (`max-w-none`), viewport `lg:h-dvh lg:max-h-dvh`
- Márgenes exteriores y bisel del marco más compactos en desktop
- Cadena flex de altura de punta a punta (room → frame → cristal → deck → rejilla)
- Columnas laterales más estrechas → más espacio al centro
- Viñeta de sala suavizada en desktop (menos sensación de encogimiento)
- Holograma ligeramente más ancho (`lg:max-w-[34rem]`) manteniendo jerarquía
- Columnas con `lg:min-h-0 lg:overflow-hidden` para contener overflow

**No usar** `transform: scale()` global: degrada nitidez y accesibilidad. Preferir proporciones, padding, `max-width` y altura disponible.

---

## 11. Mapa de archivos clave

| Área | Archivos |
|---|---|
| Sala | `src/modules/room/` |
| Planos | `visualPlanes.ts` |
| Materiales | `materialTheme.ts`, `crystalMaterial.ts` |
| Tema operativo | `monitoringTheme.ts`, `projectionTheme.ts` |
| Ambiente | `operationalRoomState.ts`, `ambientLighting.ts` |
| Microactividad | `operationalBreathing.ts`, `index.css` |
| Jerarquía | `visualHierarchy.ts` |
| Identidad | `areaIdentity.ts`, `AreaModuleIdentity.tsx` |

---

## 12. Pendiente para pulido final

| Área | Detalle |
|---|---|
| Escala fina | Ajuste por resolución concreta (monitores ultrawide vs laptop 13") si la sala aún se percibe pequeña |
| Accesibilidad | Contraste AA sistemático, foco visible, revisión de `sr-only` en etiquetas de plataforma |
| Estados límite | Muchos compromisos en consola, textos largos en holograma, área sin datos |
| Responsive avanzado | Tablet en landscape, breakpoints intermedios entre `lg` y `xl` |
| Microactividad | Calibrar intensidad si en producción distrae en sesiones largas |
| Identidad | Validar legibilidad de glifos y patrones con usuarios reales del precomité |
| Producto (fuera de DA) | Backend, permisos, evidencias, reportes — ver `mvp-estado-actual.md` |

---

## 13. Qué no debe tocarse sin aprobación

### Lógica y dominio
- `engine/`, `selectors/`, reducers, hooks, contextos
- `services/`, mocks, validación, historial, persistencia (`localStorage`)
- Contratos de tipos de dominio (`monitoring.types`, `commitment.types`, etc.)
- Tests existentes y su comportamiento esperado

### Arquitectura funcional
- Regiones de `MonitoringLayout` (left / main / right / hologram) y flujo de datos en `MonitoringPage`
- Responsabilidad de `MonitoringCenter` como orquestador de presentación
- Regla: **la UI no calcula negocio**

### Dirección de arte establecida
- Escala de planos z-index (`visualPlanes.ts`) sin revisión de diseño
- Separación de materiales (no reintroducir glassmorphism ni tarjetas web genéricas)
- Zoom CSS global en la sala
- Recolorear por área de forma que compita con estado operativo o alertas críticas
- Animar contenido del holograma (texto, botones) — solo material proyectado

### Cambios de presentación permitidos sin aprobación explícita
- Tokens Tailwind en archivos `*Theme.ts`, `visualHierarchy.ts`, `areaIdentity.ts`
- Clases de componentes de sala y monitoring **sin alterar props, eventos ni estructura de datos**
- Ajustes de padding, `max-width`, altura flex y responsive

---

## 14. Comandos de verificación

Ejecutar desde la raíz del repositorio (`NOVEX_FRONTEND/`):

```bash
npm run test
npm run typecheck
npm run build
```

**Última ejecución (30 jun 2026):**

| Comando | Resultado |
|---|---|
| `npm run test` | 4 archivos, **20/20** tests OK |
| `npm run typecheck` | OK |
| `npm run build` | OK — `dist/assets/index-5y3QEIRL.css` (124 KB), bundle JS ~357 KB |

---

## 15. Documentos relacionados

- [Estado del MVP](mvp-estado-actual.md) — producto, arquitectura de módulos y flujo de datos
- Código de referencia: `src/modules/room/`, `src/modules/monitoring/`
