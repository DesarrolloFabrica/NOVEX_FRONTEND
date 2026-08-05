import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { canCreateSituations } from '@/modules/auth/utils/permissions'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'

export function RequireSituationCreationRoute({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Validando permisos…
      </div>
    )
  }

  if (!canCreateSituations(user)) {
    return <Navigate to={getRoleLandingPath(user)} replace />
  }

  return children
}
