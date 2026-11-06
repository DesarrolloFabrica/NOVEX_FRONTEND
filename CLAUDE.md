# CLAUDE.md — NOVEX_FRONTEND

Instrucciones para asistentes de IA y desarrolladores que continúen este repositorio.
Índice de continuidad: [`docs/empalme/README.md`](docs/empalme/README.md).
Última comprobación: **2026-11-06**.

## 1. Qué es NOVEX y qué cubre este repo

NOVEX es la plataforma interna de inteligencia operacional de la Dirección de Operaciones de la CUN. Su ciclo es reportar un problema de una coordinación, seguirlo y solucionarlo dejando un aprendizaje. Se presenta como una mesa de **cartas** y un **personaje** Rive que expresa el estado de la operación ("Cartas y Circo").

- El catálogo operacional tiene **15 coordinaciones**: son las filas de `coordinations` en el backend, con una imagen cada una en `public/CoordCards/`.
- La mesa las pinta como **9 mazos**: Operación Académica agrupa 5 hijas y `coord-servicios` no se pinta como carta propia. La jerarquía está en `src/modules/operational-cards/data/productHierarchy.ts`.
- Detalle en [cartas-y-graficas.md](docs/empalme/cartas-y-graficas.md).

Este repositorio es la **SPA**. La API, la base de datos y la IA viven en el repo complementario `NOVEX_BACKEND` (`github.com/DesarrolloFabrica/NOVEX_BACKEND`; local `C:\dev\novex\NOVEX_BACKEND`).

## 2. Tecnología y arquitectura

- **Stack:** React 19, React Router 7, Vite 8, TypeScript 6, Tailwind 4, ECharts 6, Rive (`@rive-app/react-webgl2`), `@react-oauth/google`, Vitest 4, Playwright, oxlint.
- **Entrada:** `src/main.tsx`, `src/app/{App,providers,router}.tsx`.
- **Rutas:** todo converge en `/centro-operacional`. Las demás son `/admin` (solo ADMIN) y `/login`. Las rutas antiguas redirigen (`src/app/router.tsx`).
- **Núcleo activo: `src/modules/operational-cards/`.** Contiene:
  - la experiencia por rol (`experience/OperationalCenterHome.tsx`, `resolveOperationalCenterExperience.ts`);
  - los servicios REST (`services/*`);
  - los gráficos del DIRECTOR (`charts/`);
  - el personaje (`components/DirectionCharacter.tsx`).
- **Otros módulos y piezas compartidas:**
  - Autenticación: `src/modules/auth/`. Google genera el ID token, `POST /auth/google` devuelve un JWT y este se guarda en `localStorage`. Los permisos de la interfaz están en `utils/permissions.ts`.
  - Cliente HTTP: `src/shared/api/http.ts`, que lee `VITE_API_BASE_URL`.
  - Guards: `src/shared/components/`.
  - Tutorial: `src/modules/onboarding/` (ver §9).
- **Roles:**
  - DIRECTOR: solo lectura y KPIs.
  - ANALISTA: opera sobre la baraja.
  - COORDINADOR: opera su coordinación.
  - ADMIN: consulta y `/admin`.
  - **La autorización real la decide el backend.** La interfaz solo oculta o muestra elementos.

## 3. Documentación

| Documento | Uso |
|---|---|
| [`docs/empalme/README.md`](docs/empalme/README.md) | Estado, ramas, riesgos, pendientes y discrepancias (empezar aquí) |
| `docs/empalme/*.md` | Documentación técnica: [arquitectura](docs/empalme/arquitectura.md), [roles](docs/empalme/roles-y-navegacion.md), [cartas y gráficas](docs/empalme/cartas-y-graficas.md), [tutorial](docs/empalme/tutorial-guiado.md), [contratos API](docs/empalme/contratos-api.md), [pruebas](docs/empalme/pruebas-y-desarrollo.md) |
| `README.md` | Visión general. **Anterior a Cartas y Circo**: sus rutas están desactualizadas |
| `DEPLOY_FRONTEND.md` | Cloud Run y nginx (última edición en agosto; revisar antes de usar) |
| `README_ESTADO_ACTUAL_NOVEX.md` | Estado de producto. **Cifras desactualizadas**: no usar como fuente de verdad |
| `src/modules/executive-operations-center/README.md` | Describe secciones hoy retiradas de la navegación |
| `NOVEX_BACKEND/docs/` | Release, incidentes, seguridad, backups (backend) |

## 4. Ramas de referencia (verificado 2026-11-06 con `git ls-remote`)

| Referencia | Commit | Significado |
|---|---|---|
| `origin/main` | `b726c47` | Versión publicada. El deploy de Actions del 27-oct sobre este commit terminó bien |
| tag `novex-circo-prod-20261027` | → `b726c47` | Marca de la versión en producción |
| `origin/integracion/cartas-circo` | `b726c47` | Rama de integración; hoy es igual a `main` |
| `origin/sync/casa-oficina-20261030` | `7a49148` | Tutorial guiado: 3 commits sobre `b726c47`. **No integrado** |
| tag `novex-pre-circo-20261023` | → `b20ffd3` | Versión anterior a Cartas y Circo |

- **`main` local está desactualizada** (`bb0e1d2`). No la uses como base. Parte siempre de `origin/<rama>`.
- **Existe un stash antiguo** (`stash@{0}`, 4-oct) sin revisar. No lo apliques ni lo borres.

## 5. Reglas obligatorias

- Nunca asumir que `main` local está actualizada. Comprobar con `git ls-remote origin` o `git log origin/main`.
- Nunca hacer push a `main` sin autorización. **Un push a `main` despliega producción automáticamente** (`.github/workflows/deploy-frontend.yml`).
- Nunca ejecutar despliegues (`gcloud builds submit`, `gcloud run …`, `workflow_dispatch`) sin autorización.
- Nunca descartar cambios locales (`checkout -- `, `reset --hard`, `clean`, `stash drop`, `restore`) sin autorización.
- Nunca cambiar de rama, hacer stash ni rebase en este worktree mientras haya cambios del tutorial sin commit (§9).
- Nunca confundir una rama publicada con producción. Producción es lo que se desplegó desde `main`, no lo que existe en `origin`.
- Nunca considerar la documentación histórica más fiable que el código actual. Ante una contradicción, manda el código; repórtala.
- Nunca afirmar que una prueba pasa si no se ejecutó en esta sesión. Indica «no ejecutada».
- Nunca incluir credenciales, secretos, tokens, contenido de `.env` ni datos personales en documentación, commits o informes. Solo nombres de variables.
- Nunca activar el tutorial en producción sin validación funcional y autorización explícita.
- Trabajar por fases: cada fase necesita aprobación explícita, y la aprobación de una fase no cubre la siguiente.

## 6. Producción, backend y despliegue

- **No tienes acceso a producción por defecto.** Las consultas a GCP requieren credenciales del responsable. Si no las tienes, el estado de producción es «no verificado».
- **Comprobación de solo lectura permitida:** `GET` al `/health` público del frontend y a `/health/ready` del backend.
- **No ejecutes migraciones ni escrituras en ninguna base de datos compartida.** Las migraciones pertenecen al backend.
- **Variables de build** (solo nombres): `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID` y `VITE_ENABLE_EMAIL_LOGIN` (solo en local).

## 7. Antes de implementar

1. Lee `docs/empalme/README.md` y confirma la rama y el HEAD (`git status`, `git log -1`, `git ls-remote origin`).
2. Localiza el código **alcanzable** desde `src/main.tsx` y `src/app/router.tsx`. Mucho código de `src/modules` es antiguo (§9).
3. Si el cambio toca la API, contrasta el contrato en `NOVEX_BACKEND`: el controlador, el DTO y el permiso. No supongas compatibilidad.
4. Propón el cambio, con archivos, riesgos y pruebas, y **espera aprobación** antes de editar.
5. Crea las ramas nuevas desde `origin/integracion/cartas-circo` (o la base que se indique), nunca desde `main` local.

## 8. Validación

| Comando | Qué hace | Nota |
|---|---|---|
| `npm run lint` | oxlint, sin `--fix` | Solo lectura |
| `npm run typecheck` | tsc (`noEmit`) | Solo escribe `node_modules/.tmp/*.tsbuildinfo` |
| `npm test` | Vitest sobre `src` | |
| `npm run test:e2e` | Playwright con API mockeada (`e2e/`); arranca Vite en :4173 | Escribe en `test-results/` |
| `node e2e-real/run.mjs` | e2e contra backend real (`e2e-real/`). Es **la única vía soportada**: fija todas las variables y no lee `.env` | Requiere Docker; ver la nota siguiente |
| `npm run build` | build de producción | Escribe en `dist/` |

**Qué hace `node e2e-real/run.mjs`, en orden:**
1. Crea o arranca el contenedor desechable `novex-e2e-pg` (PostgreSQL, puerto local 55433).
2. En esa base, borra el esquema `public` y ejecuta las migraciones y la semilla e2e.
3. Ejecuta `npm run build` **en `../NOVEX_BACKEND`**, es decir, escribe en el `dist/` de otro repositorio.
4. Lanza Playwright con `playwright.e2e-real.config.ts`.

No invoques ese config directamente: el backend arrancaría con su propio entorno o `.env`.

- `npm run dev` arranca también `../NOVEX_BACKEND`.
- La CI ejecuta lint, typecheck, tests unitarios y build, **no los e2e**, y **no corre en PR**: solo con push a `main` o `workflow_dispatch`.
- Detalle en [pruebas-y-desarrollo.md](docs/empalme/pruebas-y-desarrollo.md).
- Pide autorización antes de ejecutar comandos que escriban archivos (build, e2e) si la fase no la concede.
- Informa siempre qué se ejecutó, el resultado literal y qué no se ejecutó.

## 9. Código funcional, histórico y experimental

- **Funcional:** lo alcanzable desde `src/main.tsx`, sobre todo `operational-cards`, `auth`, `api`, `situations`, `src/pages/LoginPage.tsx` y `src/pages/AdminConsolePage.tsx`. El test `src/app/production-data-sources.test.ts` impide que la app publicada importe mocks.
- **Histórico (retirado de la navegación):**
  - `impact-network`, `monitoring`, `dashboard`, `operational-events`;
  - las secciones Panorama, Inteligencia y Reportes de `executive-operations-center`.
  - Las rutas antiguas redirigen, el código se conserva y los mocks están en `*/data/*.mock.ts`. No los reactives sin decisión.
- **Experimental: el tutorial guiado** (`src/modules/onboarding/`, rama `sync/casa-oficina-20261030`).
  - **No está desplegado.**
  - El piloto del Coordinador solo aparece con `import.meta.env.DEV` y rol COORDINADOR (`experience/layouts/OperationalCenterMenu.tsx`).
  - El tour general sigue desactivado (`ONBOARDING_TOUR_SUSPENDED = true` en `src/modules/onboarding/OnboardingContext.tsx`). Su `OnboardingProvider` sí está montado en `src/shared/components/RootLayout.tsx`, pero no arranca ningún tour.
  - Detalle en [tutorial-guiado.md](docs/empalme/tutorial-guiado.md).
  - **Hay cambios sin commit (8 archivos) y 4 specs sin seguimiento** (`e2e/coordinator-pilot-problems-step{6..9}.spec.ts`). Preserva ese trabajo antes de cualquier operación que pueda alterarlo.

## 10. Cómo informar

- Responde en español.
- Separa **verificado** (con evidencia: archivo:línea, commit o salida de comando), **histórico** (documento o nota) y **no verificado**.
- Para cada hallazgo: qué ocurre, dónde, impacto, cómo reproducir o comprobar, y propuesta. Sin aplicarla.
- Al cerrar una tarea: archivos tocados, `git status` antes y después, pruebas ejecutadas y no ejecutadas, y riesgos abiertos.
