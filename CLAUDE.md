# CLAUDE.md — NOVEX_FRONTEND

Instrucciones para asistentes y desarrolladores.  
**Documentación vigente:** [`docs/CONTINUIDAD.md`](docs/CONTINUIDAD.md) (puntero) · canónica en backend: [`../NOVEX_BACKEND/docs/proyecto/README.md`](../NOVEX_BACKEND/docs/proyecto/README.md) · retomar: [`../NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md`](../NOVEX_BACKEND/docs/proyecto/CONTINUIDAD.md).  
Si el monorepo local está presente, también `../docs/`.

## Qué es este repo

SPA React (Cartas y Circo): Centro Operacional por rol, personaje Rive, KPIs Director, admin. API en `NOVEX_BACKEND`.

## Rama de trabajo

- **Trabajo:** `refactor/novex-consolidacion` (prod `b726c47` + tutorial `sync/casa-oficina` integrado).
- **Producción:** `origin/main` / tag `novex-circo-prod-20261027` — **no** pushear sin autorización.
- **Conservar sin tocar:** `Alejo-Rama`.
- Tutorial: `ONBOARDING_TOUR_SUSPENDED=true`; piloto solo `import.meta.env.DEV` + COORDINADOR. **No activar en prod** sin validación y autorización.

## Reglas

1. Push a `main` = deploy automático.
2. No descartar stashes/backups/tags. Bundles en `../.backups/fase00c-20261109/`.
3. Código alcanzable desde `main.tsx` / `router.tsx`. No reactivar legacy sin decisión.
4. No calcular integridad/vidas en FE; consumir overview.
5. Ante docs vs código → manda el código.
6. Vitest: si falla `localStorage`/jsdom, documentar; typecheck/build son la puerta de consolidación.
7. Trabajar por fases con aprobación explícita.

## Validación segura

| Comando | Nota |
|---|---|
| `npm run lint` | oxlint, lectura |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest; puede fallar sin entorno browser |
| `npm run build` | Escribe `dist/` |
| `node e2e-real/run.mjs` | PG desechable; compila BE |

`npm run dev` arranca también `../NOVEX_BACKEND`.
