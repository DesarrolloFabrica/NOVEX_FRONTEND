import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { hasPermission } from '@/modules/auth/utils/permissions'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'

interface RequirePermissionRouteProps {
  permission: string
  /** Destino si falta el permiso. Por defecto, el landing del rol. */
  redirectTo?: string
  children: ReactNode
}

export function RequirePermissionRoute({
  permission,
  redirectTo,
  children,
}: RequirePermissionRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Validando permisos…
      </div>
    )
  }

  if (!hasPermission(user, permission)) {
    // Antes caía a `/red-impacto` por defecto: una pantalla legacy. Ahora
    // vuelve al Centro Operacional como cualquier otra guarda.
    return <Navigate to={redirectTo ?? getRoleLandingPath(user)} replace />
  }

  return children
}
