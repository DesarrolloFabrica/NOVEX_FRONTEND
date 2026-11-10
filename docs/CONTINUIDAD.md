# Continuidad NOVEX Frontend

Rama: `refactor/novex-consolidacion` · código 01B.2: `e38bca1` · tip de la rama: el último commit de continuidad publicado en `origin`.

La documentación completa de fases (00, 01A, 01B.1, 01B.2), migraciones, roles PostgreSQL y procedimiento de pruebas está en el backend:

**`NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`**

## Estado FE

- Commits 01B.2: `6e71c0b` (Director / K-01), `e38bca1` (Coordinador / K-03).
- Pendiente UX: UI de anulación y traslado; resto FE-01…FE-04.
- No push a `main`. No activar tutorial en producción sin autorización.
- **Hallazgo pendiente (integración de KPIs, no corregido):** `parseDirectionIntegrity` en `src/modules/operational-cards/services/operational-kpi.service.ts` lanza `OperationalKpiContractError` ante una `direction.directionIntegrity.rule` que no esté en `DIRECTION_INTEGRITY_RULES`. Hoy coincide con las 6 reglas del backend, pero una regla nueva rompería toda la respuesta de Dirección pese a ser un contrato aditivo. Resolver al integrar los KPIs (p. ej. regla desconocida → `null`); detalle en el `CONTINUIDAD.md` del backend.

## Fase 02 (puntero)

Plan de integración funcional (inventario, contratos, orden, riesgos, Cursor vs Antigravity):

**`NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`** §«Fase 02 — Plan de integración funcional FE».

En esta máquina la copia de consolidación es `NOVEX-review-01b2-frontend` (`refactor/novex-consolidacion`). No trabajar sobre el checkout `main` de `Proyecto-Novex/NOVEX_FRONTEND`.

**Primero:** cableado + UI de **anulación ADMIN** (mismo lote de clients para traslado). Es el hueco más grande con BE ya cerrado, cabe en `ProblemDetail`/`ProblemActions` sin tocar KPIs ni rediseñar Circo.

### Fase 02A (técnica, sin UI visual)

Integrado en esta rama: tipos `CANCELLED` / `cancellation` / `canCancel` / `canTransfer`, clients `cancelSituation` + `transferSituationCoordination`, validación de motivo, submission kinds, reducer/hook, host `situation-admin-actions` en `ProblemActions` para Antigravity. Sin botones/modales todavía.

### Fase 02B (UI/UX anulación y traslado administrativo)

Integrado por Antigravity:
- Sección secundaria «Gestión administrativa» en `ProblemActions` dentro del host `situation-admin-actions`, visible solo si `administration.allow` y existen pistas `canCancel` / `canTransfer`.
- Modales accesibles `CancelSituationModal` y `TransferCoordinationModal` con validación de 10 a 1000 caracteres, trampa de foco, Escape, prevención de doble clic y manejo de errores con refresco de concurrencia.
- Vista de estado `CANCELLED` reflejada con distinción como acción administrativa excepcional.
- Filtrado preventivo de coordinación actual y de afectada en reportes INTER.
- Integración visual sobria coherente con la identidad Cartas y Circo y soporte en tema ticket.

## Retomar

```bash
git fetch origin
git checkout refactor/novex-consolidacion
git pull --ff-only origin refactor/novex-consolidacion
```

Clonar juntos BE y FE en carpetas hermanas para que las rutas relativas del monorepo funcionen.
