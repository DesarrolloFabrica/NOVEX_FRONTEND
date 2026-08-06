# Despliegue del frontend NOVEX (Cloud Run)

Guía operativa para PowerShell. **No incluye secretos.**

## 1. Arquitectura

SPA React + Vite + TypeScript → build estático (`dist/`) → Nginx en contenedor → Cloud Run (puerto **8080**).

```
Navegador → Cloud Run (novex-frontend) → Nginx
                │
                └── /health → "ok"
                └── /* → index.html (SPA)
                └── /assets/* → JS/CSS con hash (cache largo)

API calls del navegador → VITE_API_BASE_URL (backend Cloud Run u otro)
Google OAuth → VITE_GOOGLE_CLIENT_ID (Client ID público)
```

Las variables `VITE_*` se **incrustan en tiempo de compilación**. Cambiarlas exige **reconstruir la imagen**.

## 2. Requisitos

- Node.js 20+ (recomendado 22)
- npm
- Docker Desktop
- Google Cloud SDK (`gcloud`)
- Cuenta con permisos sobre el proyecto

## 3–6. Identificadores GCP

| Concepto | Valor |
|----------|--------|
| Project Name | Operacion Producto y LMS |
| Project ID | `it-fab-contenido-edu-5` |
| Región | `us-central1` |
| Servicio Cloud Run | `novex-frontend` |
| Artifact Registry | `novex` |
| Imagen | `novex-frontend` |
| Ruta imagen | `us-central1-docker.pkg.dev/it-fab-contenido-edu-5/novex/novex-frontend` |
| Backend | `https://novex-backend-550902908078.us-central1.run.app` |
| API base (`VITE_API_BASE_URL`) | `https://novex-backend-550902908078.us-central1.run.app/api/v1` |
| SA runtime (sugerida) | `novex-frontend-runner@it-fab-contenido-edu-5.iam.gserviceaccount.com` |

> No usar el proyecto Acervo ni `gen-lang-client-0049269139`.

## 7. Variables Vite

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `VITE_API_BASE_URL` | Sí | Base completa del API, **incluye** `/api/v1` |
| `VITE_API_URL` | No | Alias de compatibilidad para instalaciones anteriores |
| `VITE_GOOGLE_CLIENT_ID` | Sí | OAuth Client ID (público) |
| `VITE_ENABLE_EMAIL_LOGIN` | No | Solo desarrollo local; mantener `false` fuera de local |
| `VITE_APP_NAME` | No | Default `NOVEX` |
| `VITE_APP_ENV` | No | `development` / `production` |

El cliente usa `VITE_API_BASE_URL` como variable principal y recurre a
`VITE_API_URL` únicamente por compatibilidad.

Ejemplo local / desarrollo apuntando al backend desplegado:

```env
VITE_API_BASE_URL=https://novex-backend-550902908078.us-central1.run.app/api/v1
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_ENABLE_EMAIL_LOGIN=true
VITE_APP_NAME=NOVEX
VITE_APP_ENV=development
```

Ejemplo producción (valor al construir la imagen):

```env
VITE_API_BASE_URL=https://novex-backend-550902908078.us-central1.run.app/api/v1
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_ENABLE_EMAIL_LOGIN=false
VITE_APP_NAME=NOVEX
VITE_APP_ENV=production
```

## 8. Públicas vs secretos

**Públicas (van al JS del navegador):** todas las `VITE_*`.

**Nunca en el frontend:**

- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- contraseñas DB / Cloud SQL
- claves privadas / tokens admin

No uses Secret Manager para variables que deben estar en el bundle Vite.

## 9–10. Configuración local y `.env`

```powershell
Copy-Item .env.example .env
# Editar .env con sintaxis dotenv pura:
# VITE_GOOGLE_CLIENT_ID=valor
# Sin prefijos tipo ".env frontend:"
# Sin comillas salvo que sean necesarias
# Sin espacios alrededor de =

npm ci
npm run dev
```

`.env` está en `.gitignore`. Solo versionar `.env.example`.

## 11–12. Google OAuth

- Provider: `@react-oauth/google` en `src/main.tsx`
- Login: `LoginPage` → backend `POST /auth/google` con `{ credential }`
- Client ID solo desde `VITE_GOOGLE_CLIENT_ID`

Tras el despliegue, en Google Cloud Console → Credenciales OAuth → Orígenes JavaScript autorizados:

- `http://localhost:5173`
- `https://URL-REAL-DEL-FRONTEND` (la URL de Cloud Run)

No inventar la URL productiva antes del primer deploy.

## 13. URL del backend

Debe configurarse mediante `VITE_API_BASE_URL` (no hardcode en componentes).

El cliente HTTP está en `src/shared/api/http.ts`.

CORS: el backend debe permitir el origen del frontend Cloud Run.

## 14–15. Build y preview local

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

## 16–17. Docker local

```powershell
docker build `
  --build-arg VITE_API_BASE_URL=https://novex-backend-550902908078.us-central1.run.app/api/v1 `
  --build-arg VITE_GOOGLE_CLIENT_ID=CLIENT_ID_DE_PRUEBA `
  --build-arg VITE_APP_NAME=NOVEX `
  --build-arg VITE_APP_ENV=production `
  -t novex-frontend-local .

docker run --rm -p 8080:8080 novex-frontend-local
# Probar: http://localhost:8080/health  → ok
```

No ejecutar `docker push` hasta estar listo para desplegar.

## 18. Cloud Build

Archivo: `cloudbuild.frontend.yaml`

```powershell
gcloud builds submit `
  --config=cloudbuild.frontend.yaml `
  --project=it-fab-contenido-edu-5 `
  --substitutions=_BACKEND_URL="https://novex-backend-550902908078.us-central1.run.app/api/v1",_GOOGLE_CLIENT_ID="TU_CLIENT_ID",COMMIT_SHA="$(git rev-parse --short HEAD)"
```

## 19. Despliegue manual (PowerShell)

1. Completar `$GOOGLE_CLIENT_ID` en `scripts/deploy-frontend.ps1` si aún está vacío (`$BACKEND_URL` y `$PROJECT_ID` ya están configurados).
2. Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-frontend.ps1
```

El script pide confirmación antes de crear/modificar recursos.

## 20. Actualización de UI

Cualquier cambio de código o de `VITE_*` → nuevo build de imagen → nuevo deploy (nueva revisión Cloud Run).

## 21. Logs

```powershell
gcloud run services logs read novex-frontend --region=us-central1 --project=it-fab-contenido-edu-5 --limit=50
```

## 22–23. Revisiones y rollback

```powershell
gcloud run revisions list --service=novex-frontend --region=us-central1 --project=it-fab-contenido-edu-5

gcloud run services update-traffic novex-frontend `
  --region=us-central1 `
  --project=it-fab-contenido-edu-5 `
  --to-revisions=REVISION_ANTERIOR=100
```

## 24. Health check

`GET /health` → HTTP 200, body `ok` (Nginx, sin cargar la SPA).

Usado en startup y liveness probes.

## 25–27. Cache, Nginx, rutas SPA

- `/assets/*` y estáticos con extensión: cache largo + `immutable`
- `index.html`: `no-cache` (para recibir nuevas versiones)
- SPA: `try_files $uri $uri/ /index.html;`
- Puerto: **8080**
- Headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`
- **CSP no aplicada** de forma estricta: rompería Google OAuth, fonts y API dinámica. Documentado como excepción consciente.

Rutas internas relevantes: `/login`, `/dashboard`, `/red-impacto`, `/situaciones`, `/gestion`.

## 28–33. Errores frecuentes

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `ERR_CONNECTION_REFUSED` | Vite no arrancado / puerto incorrecto | `npm run dev` (5173) o Docker 8080 |
| Failed to resolve `@react-oauth/google` | `node_modules` incompleto | `npm ci` |
| `Falta VITE_GOOGLE_CLIENT_ID` | `.env` ausente o mal formado | Corregir `.env` / rebuild |
| API apunta a localhost en prod | Build sin `VITE_API_BASE_URL` | Rebuild con build-arg |
| Variables no se actualizan | Vite es build-time | Rebuild imagen |
| 404 al refrescar `/dashboard` | Nginx sin `try_files` | Verificar `nginx.conf`, copiado por el Dockerfile |
| CORS | Backend no permite origen FE | Configurar CORS en backend |
| OAuth popup falla | Origen no autorizado | Añadir URL FE en Google Console |
| Dependencias faltantes | Clone sin install | `npm ci` |

## Cuenta de servicio

Nombre sugerido: `novex-frontend-runner`
Email: `novex-frontend-runner@it-fab-contenido-edu-5.iam.gserviceaccount.com`

Un frontend estático **no** necesita Cloud SQL, Secret Manager, Storage ni Gemini. Mínimo privilegio (runtime Cloud Run). **No crear la SA desde este documento sin aprobación.**

## Configuración Cloud Run inicial

- CPU 1 · Memoria 512Mi · Min 0 · Max 5 · Concurrency 80 · Timeout 60s · gen2
  (gen2 no admite menos de 512Mi)
- Allow unauthenticated: sí · Ingress: all · Port 8080
- Probes: `/health`

## GitHub Actions

Workflow: `.github/workflows/deploy-frontend.yml` (manual `workflow_dispatch`).

Variables de repositorio esperadas:

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_APP_NAME`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`
- `GCP_RUNTIME_SERVICE_ACCOUNT`

Autenticación vía Workload Identity Federation (sin JSON keys).
