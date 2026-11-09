# NOVEX Frontend

SPA React de **NOVEX** (Cartas y Circo): Centro Operacional por rol, personaje Rive, KPIs, admin.

**Documentación vigente:** [`../docs/README.md`](../docs/README.md)

| Ref | Commit | Uso |
|---|---|---|
| `origin/main` / tag `novex-circo-prod-20261027` | `b726c47` | Producción |
| `refactor/novex-consolidacion` | prod + tutorial (experimentales off) | Desarrollo |
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

Tutorial: código presente; tour general suspendido; piloto solo en desarrollo.  
Compañero: [NOVEX_BACKEND](https://github.com/DesarrolloFabrica/NOVEX_BACKEND).
