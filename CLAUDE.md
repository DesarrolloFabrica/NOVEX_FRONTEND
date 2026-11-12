# CLAUDE.md — NOVEX_FRONTEND

Instrucciones para asistentes y desarrolladores.  
**Documentación:** índice único en el backend, [`../NOVEX_BACKEND/docs/proyecto/README.md`](../NOVEX_BACKEND/docs/proyecto/README.md) · estado, pendientes y cómo retomar: [`../NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`](../NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md) · despliegue: `DEPLOY_FRONTEND.md`.  
No crear docs sueltos en este repo: ampliar el doc del índice que corresponda. Si el monorepo local está presente, también `../docs/`.

## Qué es este repo

SPA React (Cartas y Circo): Centro Operacional por rol, personaje Rive, KPIs Director, admin. API en `NOVEX_BACKEND`.

## Rama de trabajo

- **Trabajo:** `refactor/novex-consolidacion` (prod `b726c47` + fases 01B/02/03a + recorrido del coordinador).
- **Producción:** `origin/main` / tag `novex-circo-prod-20261027` — **no** pushear sin autorización.
- **Conservar sin tocar:** `Alejo-Rama`.
- Tutorial: tour general suspendido (`ONBOARDING_TOUR_SUSPENDED`). Recorrido del COORDINADOR (`src/modules/onboarding/`): en desarrollo, o en un despliegue con `VITE_ENABLE_COORDINATOR_TOUR=true`. **No activar en prod** sin validación y autorización.

## Reglas

1. Push a `main` = deploy automático.
2. No descartar stashes/backups/tags. Bundles en `../.backups/fase00c-20261109/`.
3. Código alcanzable desde `main.tsx` / `router.tsx`. No reactivar legacy sin decisión.
4. No calcular integridad/vidas en FE; consumir overview.
5. Ante docs vs código → manda el código.
6. Vitest usa `src/test/setupStorage.ts` (almacenamiento en memoria cuando el global de Node no sirve, p. ej. Node 26).
7. Trabajar por fases con aprobación explícita.

## Validación segura

| Comando | Nota |
|---|---|
| `npm run lint` | oxlint, lectura |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (jsdom) |
| `npx playwright test --workers=1` | E2E con API simulada; un worker para no saturar la RAM |
| `npm run build` | Escribe `dist/` |
| `node e2e-real/run.mjs` | PG desechable; compila BE |

`npm run dev` arranca también `../NOVEX_BACKEND`.
