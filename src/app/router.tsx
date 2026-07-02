// Capa: app (enrutado).
// Responsabilidad: declarar las rutas y su protección. Sin lógica de negocio.

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { MonitoringPage } from '@/pages/MonitoringPage'

export const router = createBrowserRouter([
  // Entrada por defecto: se redirige al Centro de Monitoreo (que está protegido).
  { path: '/', element: <Navigate to="/monitoring" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    // Todas las rutas hijas requieren sesión activa.
    element: <ProtectedRoute />,
    children: [{ path: '/monitoring', element: <MonitoringPage /> }],
  },
])
