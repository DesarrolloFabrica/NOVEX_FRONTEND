# NOVEX Frontend

SPA React de **NOVEX** (Cartas y Circo): Centro Operacional por rol, personaje Rive, KPIs, admin.

**Documentación:** índice único en el backend, [`NOVEX_BACKEND/docs/proyecto/README.md`](../NOVEX_BACKEND/docs/proyecto/README.md) · estado y cómo retomar en [`CONTINUIDAD.md`](../NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md) · despliegue del frontend en [`DEPLOY_FRONTEND.md`](DEPLOY_FRONTEND.md).
(Si solo clonaste este repo: [NOVEX_BACKEND en GitHub](https://github.com/DesarrolloFabrica/NOVEX_BACKEND/tree/refactor/novex-consolidacion/docs/proyecto).)

| Ref | Commit | Uso |
|---|---|---|
| `origin/main` / tag `novex-circo-prod-20261027` | `b726c47` | Producción |
| `refactor/novex-consolidacion` | tip de la rama | Desarrollo (sin desplegar) |
| `Alejo-Rama` | conservada | No modificar en consolidación |

**Node 22.** Push a `main` despliega Cloud Run.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev   # también arranca ../NOVEX_BACKEND
```

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/app/` | Entrada, router, rutas perezosas, redirecciones de rutas legadas |
| `src/modules/operational-cards/` | Núcleo: shells por rol, cartas, detalle, formularios, servicios, personaje |
| `src/modules/onboarding/` | Recorrido guiado del coordinador (motor, pasos, estilos) |
| `src/modules/admin-console/`, `auth/` | Administración de usuarios y sesión |
| `src/modules/executive-operations-center/` | Layout del Centro y constantes de rutas |
| `e2e/` | Playwright con API simulada (`npm run test:e2e`; usar `--workers=1` en equipos con poca RAM) |
| `e2e-real/` | E2E contra backend real y PostgreSQL desechable (`node e2e-real/run.mjs`) |
| `dev/` | Página de laboratorio del personaje (`dev/character-lives.html`, solo desarrollo) |
| `scripts/` | `dev.mjs` (FE+BE), `deploy-frontend.ps1`, `optimize-images.py` (WebP de `public/`) |

Recorrido del coordinador: activo en desarrollo; en un despliegue solo con `VITE_ENABLE_COORDINATOR_TOUR=true`.
Compañero: [NOVEX_BACKEND](https://github.com/DesarrolloFabrica/NOVEX_BACKEND).
