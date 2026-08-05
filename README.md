# Novex Frontend

Centro de Monitoreo Operativo — frontend en **React + TypeScript + Vite + Tailwind CSS v4**.

## Estructura del repositorio

```
NOVEX_FRONTEND/
├── src/              # Código fuente y pruebas unitarias
├── public/           # Assets estáticos
├── e2e/              # Pruebas Playwright
├── DOCS/             # Documentación de producto
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
npm run dev        # Servidor de desarrollo (http://localhost:5173)
npm run build      # Build de producción
npm run preview    # Vista previa del build
npm run test       # Tests (Vitest)
npm run test:e2e   # Pruebas end-to-end (Playwright)
npm run typecheck  # Verificación de tipos
npm run lint       # Oxlint
```

## Documentación

- [Estado del MVP](DOCS/mvp-estado-actual.md)
- [Dirección de arte](DOCS/novex-direccion-arte-estado-actual.md)
