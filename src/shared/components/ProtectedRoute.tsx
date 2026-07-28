// Capa: componente compartido (guard de rutas).
// Responsabilidad: proteger rutas que requieren sesión. Si no hay usuario
// autenticado, redirige a /login; en caso contrario, renderiza la ruta hija.

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Validando sesión…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
