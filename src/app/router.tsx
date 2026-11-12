// Capa: app (enrutado).
// Responsabilidad: declarar las rutas y su protección. Sin lógica de negocio.
// Experiencia principal: Centro Operacional (los cuatro roles aterrizan aquí).

import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { RootLayout } from '@/shared/components/RootLayout'
import { RedirectToInternalReport } from '@/shared/components/RedirectToInternalReport'
import { RoleLandingRoute } from '@/shared/components/RoleLandingRoute'
import { RequireRoleRoute } from '@/shared/components/RequireRoleRoute'
import { RequireSituationCreationRoute } from '@/shared/components/RequireSituationCreationRoute'
// Constantes desde su archivo, no desde el barrel del módulo: el barrel
// re-exporta páginas legacy (Panorama, Inteligencia, Reportes…) y las metía en
// el bundle inicial.
import {
  EXECUTIVE_OPERATIONS_HOME,
  OPERATIONAL_SHELL_ROLES,
} from '@/modules/executive-operations-center/constants/routes'
import {
  AdminConsolePage,
  Deferred,
  ExecutiveOperationsLayout,
  LoginPage,
  OperationalCenterHome,
} from '@/app/lazyRoutes'
import {
  LEGACY_EXECUTIVE_SECTION_REDIRECTS,
  LEGACY_PLATFORM_REDIRECTS,
} from '@/app/legacyOperationalRedirects'

/**
 * Pantallas legacy retiradas como destino (fase 1).
 *
 * Dashboard, Red de impacto, Situaciones registradas, Gestión de situaciones y
 * las secciones Panorama / Inteligencia IA / Auditoría dejaron de ser destinos
 * de navegación: sus rutas llevan al Centro Operacional. Los módulos, páginas
 * y servicios NO se borran en esta fase; solo dejan de montarse desde aquí.
 *
 * Se redirige directamente al Centro (no al alias intermedio) para que ninguna
 * cadena de redirecciones pase por otra ruta legacy. El Centro admite los
 * cuatro roles, así que el destino nunca rebota.
 */
const toOperationalCenter = (
  <Navigate to={EXECUTIVE_OPERATIONS_HOME} replace />
)

/* Login, Centro y consola admin son chunks propios (ver `lazyRoutes`). */

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: (
          <Deferred>
            <LoginPage />
          </Deferred>
        ),
      },
      // Alias legado. Fuera de ProtectedRoute desde siempre; el destino sí
      // está protegido, así que sin sesión termina en /login.
      { path: '/monitoring', element: toOperationalCenter },
      {
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <RoleLandingRoute /> },
          {
            /*
             * Administración de usuarios: se CONSERVA. Solo ADMIN. Ya no se
             * llega por el carril ni por el menú Plataforma (retirados): el
             * acceso está en el menú de usuario del ADMIN.
             */
            path: '/admin',
            element: (
              <RequireRoleRoute role="ADMIN">
                <Deferred>
                  <AdminConsolePage />
                </Deferred>
              </RequireRoleRoute>
            ),
          },
          {
            path: EXECUTIVE_OPERATIONS_HOME,
            element: (
              <RequireRoleRoute role={OPERATIONAL_SHELL_ROLES}>
                <Deferred>
                  <ExecutiveOperationsLayout />
                </Deferred>
              </RequireRoleRoute>
            ),
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={null}>
                    <OperationalCenterHome />
                  </Suspense>
                ),
              },
            ],
          },
          /*
           * FE-04: redirecciones ligeras FUERA del layout ejecutivo.
           * Si viven como hijas de ExecutiveOperationsLayout, el proveedor
           * legado monta y dispara la carga masiva (situaciones/IA/historial)
           * antes de que Navigate redirija.
           */
          ...LEGACY_EXECUTIVE_SECTION_REDIRECTS.map((path) => ({
            path,
            element: toOperationalCenter,
          })),
          ...LEGACY_PLATFORM_REDIRECTS.map((path) => ({
            path,
            element: toOperationalCenter,
          })),
          {
            // Compatibilidad con el antiguo registro de situaciones: abre el
            // formulario INTERNAL del Centro (se conserva tal cual).
            path: '/situaciones/nueva',
            element: (
              <RequireSituationCreationRoute>
                <RedirectToInternalReport />
              </RequireSituationCreationRoute>
            ),
          },
          {
            path: '/operational-events/register',
            element: <RedirectToInternalReport />,
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
