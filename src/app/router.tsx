// Capa: app (enrutado).
// Responsabilidad: declarar las rutas y su protección. Sin lógica de negocio.
// Experiencia principal: Centro Operacional (los cuatro roles aterrizan aquí).

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { RootLayout } from '@/shared/components/RootLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RedirectToInternalReport } from '@/shared/components/RedirectToInternalReport'
import { RoleLandingRoute } from '@/shared/components/RoleLandingRoute'
import { RequireRoleRoute } from '@/shared/components/RequireRoleRoute'
import { RequireSituationCreationRoute } from '@/shared/components/RequireSituationCreationRoute'
import { AdminConsolePage } from '@/pages/AdminConsolePage'
import {
  EXECUTIVE_OPERATIONS_HOME,
  OPERATIONAL_SHELL_ROLES,
  ExecutiveOperationsLayout,
} from '@/modules/executive-operations-center'
import { OperationalCenterHome } from '@/modules/operational-cards/experience/OperationalCenterHome'

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

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
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
                <AdminConsolePage />
              </RequireRoleRoute>
            ),
          },
          {
            path: EXECUTIVE_OPERATIONS_HOME,
            element: (
              <RequireRoleRoute role={OPERATIONAL_SHELL_ROLES}>
                <ExecutiveOperationsLayout />
              </RequireRoleRoute>
            ),
            children: [
              { index: true, element: <OperationalCenterHome /> },
              // Secciones ejecutivas legacy (pestañas retiradas).
              { path: 'panorama', element: toOperationalCenter },
              { path: 'inteligencia', element: toOperationalCenter },
              { path: 'reportes', element: toOperationalCenter },
            ],
          },
          { path: '/dashboard', element: toOperationalCenter },
          { path: '/red-impacto', element: toOperationalCenter },
          { path: '/situaciones', element: toOperationalCenter },
          { path: '/gestion', element: toOperationalCenter },
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
          { path: '/intelligence', element: toOperationalCenter },
          { path: '/operational-events', element: toOperationalCenter },
          { path: '/situation-management', element: toOperationalCenter },
          { path: '/legacy-monitoring', element: toOperationalCenter },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
