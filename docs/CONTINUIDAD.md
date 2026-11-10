# Continuidad NOVEX Frontend

Rama: `refactor/novex-consolidacion` · código 01B.2: `e38bca1` · tip de la rama: el último commit de continuidad publicado en `origin`.

La documentación completa de fases (00, 01A, 01B.1, 01B.2), migraciones, roles PostgreSQL y procedimiento de pruebas está en el backend:

**`NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`**

## Estado FE

- Commits 01B.2: `6e71c0b` (Director / K-01), `e38bca1` (Coordinador / K-03).
- Pendiente UX: UI de anulación y traslado; resto FE-01…FE-04.
- No push a `main`. No activar tutorial en producción sin autorización.
- **Hallazgo pendiente (integración de KPIs, no corregido):** `parseDirectionIntegrity` en `src/modules/operational-cards/services/operational-kpi.service.ts` lanza `OperationalKpiContractError` ante una `direction.directionIntegrity.rule` que no esté en `DIRECTION_INTEGRITY_RULES`. Hoy coincide con las 6 reglas del backend, pero una regla nueva rompería toda la respuesta de Dirección pese a ser un contrato aditivo. Resolver al integrar los KPIs (p. ej. regla desconocida → `null`); detalle en el `CONTINUIDAD.md` del backend.

## Retomar

```bash
git fetch origin
git checkout refactor/novex-consolidacion
git pull --ff-only origin refactor/novex-consolidacion
```

Clonar juntos BE y FE en carpetas hermanas para que las rutas relativas del monorepo funcionen.
