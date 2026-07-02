// Capa: componente compartido (guard de rutas).
// Responsabilidad: proteger rutas que requieren sesión. Si no hay usuario
// autenticado, redirige a /login; en caso contrario, renderiza la ruta hija.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
