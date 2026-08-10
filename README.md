# Novex Frontend

Centro de Monitoreo Operativo — frontend en **React + TypeScript + Vite + Tailwind CSS v4**.

## Estructura del repositorio

```
NOVEX_FRONTEND/
├── src/              # Código fuente y pruebas unitarias
├── public/           # Assets estáticos
├── e2e/              # Pruebas Playwright
├── docker/           # Configuración de referencia para Nginx
├── scripts/          # Automatización de despliegue
└── package.json      # Dependencias y scripts
```

## Requisitos

- Node.js 20+
- npm

## Comandos

```bash
npm install
npm run dev        # Inicia backend + frontend en el workspace local
npm run dev:frontend # Solo Vite (http://localhost:5173)
npm run build      # Build de producción
npm run preview    # Vista previa del build
npm run test       # Tests (Vitest)
npm run test:e2e   # Pruebas end-to-end (Playwright)
npm run typecheck  # Verificación de tipos
npm run lint       # Oxlint
```

## Despliegue

Ver [DEPLOY_FRONTEND.md](DEPLOY_FRONTEND.md).
