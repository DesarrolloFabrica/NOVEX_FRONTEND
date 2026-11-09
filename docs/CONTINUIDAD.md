# Continuidad NOVEX Frontend

Rama: `refactor/novex-consolidacion` · tip de sincronización: `e144454` (código 01B.2 en `e38bca1`).

La documentación completa de fases (00, 01A, 01B.1, 01B.2), migraciones, roles PostgreSQL y procedimiento de pruebas está en el backend:

**`NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`**

## Estado FE

- Commits 01B.2: `6e71c0b` (Director / K-01), `e38bca1` (Coordinador / K-03).
- Pendiente UX: UI de anulación y traslado; resto FE-01…FE-04.
- No push a `main`. No activar tutorial en producción sin autorización.

## Retomar

```bash
git fetch origin
git checkout refactor/novex-consolidacion
git pull --ff-only origin refactor/novex-consolidacion
```

Clonar juntos BE y FE en carpetas hermanas para que las rutas relativas del monorepo funcionen.
