# O.M.E.G.A. — Estado actual del MVP

> Centro de Monitoreo Operativo para validar compromisos institucionales por área durante el precomité.
> Documento de referencia del MVP en desarrollo (frontend con datos mock, sin backend).

Stack: **React + TypeScript + Vite + Tailwind CSS v4**. Pruebas con **Vitest**.

---

## 1. Estado del producto

Funcionalidades disponibles hoy:

- **Login mock**: acceso como *Supervisor* o como *Ejecutor* (seleccionando un área operativa). Sin credenciales reales.
- **Centro de Monitoreo funcional** (`/monitoring`): protegido por sesión; sin sesión redirige a `/login`.
- **Selección de área**: franja superior (`AreaFocusStrip`) con foco operativo claro.
- **Visión General agregada**: el área global consolida la salud de todas las áreas operativas.
- **Consola de evaluación**: lista compacta de compromisos del área, con **filtro por estado** y **orden por impacto** (estado local de UI).
- **Holograma**: vista oficial de detalle y trazabilidad del compromiso proyectado (detalle completo, última validación e historial compacto).
- **Panel de inteligencia**: riesgo operativo, alertas (incumplidos, críticos, pendientes) y compromiso proyectado.
- **Validación de compromisos**: el supervisor marca *Cumplido* / *Incumplido* desde el Holograma; el motor recalcula la salud del área automáticamente.
- **Historial básico**: cada validación registra una entrada de trazabilidad (de quién, cuándo y el cambio).
- **Persistencia temporal en localStorage**: las validaciones y el historial sobreviven al refresh (capa de demo, con botón "Reiniciar datos").
- **Tests básicos**: motor de salud, selectores, reducer de compromisos y utilidad de persistencia.

---

## 2. Arquitectura

### Módulos principales (`src/modules/`)

- **`areas/`**: catálogo oficial de áreas (tipos, mock, utilidades).
- **`auth/`**: sesión mock (tipos, usuarios mock, servicio, contexto/reducer, hook `useAuth`).
- **`commitments/`**: compromisos (tipos, mock, servicio, reducer, contexto, hook `useCommitments`, utilidad de storage).
- **`monitoring/`**: dominio de salud (tipos, **engine** puro, **selectors**, constantes/umbrales, tema visual y componentes de la Sala).
- **`shared/`**: utilidades y componentes transversales (p. ej. `ProtectedRoute`, `getErrorMessage`).
- **`app/`**: composición (`App`, `router`, `providers`). **`pages/`**: `LoginPage`, `MonitoringPage`.

### Flujo de datos

```
mocks  →  services  →  context / reducer  →  selectors / engine  →  UI
```

- **mocks**: datos de ejemplo (áreas, compromisos).
- **services**: simulan el backend (Promesas con delay); única capa a reemplazar cuando exista API.
- **context / reducer**: estado global e inmutable (sesión, compromisos, trazabilidad).
- **selectors / engine**: derivación y **cálculo de negocio puro** (salud, riesgo, estado del entorno).
- **UI**: componentes de presentación que consumen datos ya derivados.

### Regla clave

> **La UI no calcula negocio.** Toda la lógica de salud/riesgo vive en el `engine` (funciones puras) y se expone vía `selectors`. Los componentes solo reciben props ya listas y propagan eventos. El estado puramente visual (selección, filtro, orden) vive local en la UI; el estado de dominio vive en los contextos/reducers.

---

## 3. Qué NO existe todavía

- **Backend real** (todo es mock + localStorage temporal).
- **Integración con Actas**.
- **Usuarios reales** (autenticación/identidad).
- **Permisos reales** (control de acceso por rol más allá de la UI).
- **Evidencias / archivos** adjuntos a compromisos.
- **Reportes**.
- **Exportación** de datos.

---

## 4. Próximos pasos sugeridos

- **Backend / API**: sustituir los `services` mock por integración real (manteniendo contratos).
- **Integración con Actas**: vincular compromisos con su acta de origen.
- **Evidencias**: soporte para adjuntos/pruebas de cumplimiento.
- **Reportes**: vistas/resúmenes operativos y exportación.
- **Hardening visual**: pulir accesibilidad (contraste AA), estados límite y responsive avanzado.
- **Más tests**: cobertura de contextos, hooks e interacción de componentes (p. ej. con Testing Library).
