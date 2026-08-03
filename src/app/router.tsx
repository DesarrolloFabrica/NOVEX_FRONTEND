// Capa: app (enrutado).
// Responsabilidad: declarar las rutas y su protección. Sin lógica de negocio.
// Experiencia principal: Red de impacto.

import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { RootLayout } from '@/shared/components/RootLayout'
import { LoginPage } from '@/pages/LoginPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { OperationalEventsCenterPage } from '@/pages/OperationalEventsCenterPage'
import { OperationalIntelligencePage } from '@/pages/OperationalIntelligencePage'
import { RegisterOperationalEventPage } from '@/pages/RegisterOperationalEventPage'
import { RequirePermissionRoute } from '@/shared/components/RequirePermissionRoute'

function RedirectPreservingSearch({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search}`} replace />
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Navigate to="/red-impacto" replace /> },
      { path: '/login', element: <LoginPage /> },
      // Alias legados para no romper enlaces anteriores.
      { path: '/monitoring', element: <RedirectPreservingSearch to="/gestion" /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <OperationalIntelligencePage /> },
          {
            path: '/red-impacto',
            lazy: async () => {
              const { ImpactNetworkPage } = await import('@/pages/ImpactNetworkPage')
              return { Component: ImpactNetworkPage }
            },
          },
          {
            path: '/situaciones',
            element: <OperationalEventsCenterPage />,
          },
          {
            path: '/situaciones/nueva',
            element: (
              <RequirePermissionRoute permission="SITUATIONS_CREATE">
                <RegisterOperationalEventPage />
              </RequirePermissionRoute>
            ),
          },
          { path: '/gestion', element: <MonitoringPage /> },
          { path: '/intelligence', element: <RedirectPreservingSearch to="/dashboard" /> },
          { path: '/operational-events', element: <RedirectPreservingSearch to="/situaciones" /> },
          { path: '/operational-events/register', element: <RedirectPreservingSearch to="/situaciones/nueva" /> },
          { path: '/situation-management', element: <RedirectPreservingSearch to="/gestion" /> },
          { path: '/legacy-monitoring', element: <RedirectPreservingSearch to="/gestion" /> },
        ],
      },
    ],
  },
])
