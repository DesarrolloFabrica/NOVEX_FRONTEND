// Capa: app (enrutado).
// Responsabilidad: declarar las rutas y su protección. Sin lógica de negocio.
// Experiencia principal: Centro de Inteligencia Operacional.

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { OperationalEventsCenterPage } from '@/pages/OperationalEventsCenterPage'
import { OperationalIntelligencePage } from '@/pages/OperationalIntelligencePage'
import { RegisterOperationalEventPage } from '@/pages/RegisterOperationalEventPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/intelligence" replace /> },
  { path: '/login', element: <LoginPage /> },
  // Alias legado: el monitoreo de compromisos ya no es la entrada.
  { path: '/monitoring', element: <Navigate to="/legacy-monitoring" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/intelligence', element: <OperationalIntelligencePage /> },
      {
        path: '/operational-events',
        element: <OperationalEventsCenterPage />,
      },
      {
        path: '/operational-events/register',
        element: <RegisterOperationalEventPage />,
      },
      {
        path: '/legacy-monitoring',
        element: <MonitoringPage />,
      },
    ],
  },
])
