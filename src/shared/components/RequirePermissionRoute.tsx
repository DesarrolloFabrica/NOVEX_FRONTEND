import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { hasPermission } from '@/modules/auth/utils/permissions'

interface RequirePermissionRouteProps {
  permission: string
  redirectTo?: string
  children: ReactNode
}

export function RequirePermissionRoute({
  permission,
  redirectTo = '/red-impacto',
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
    return <Navigate to={redirectTo} replace />
  }

  return children
}
