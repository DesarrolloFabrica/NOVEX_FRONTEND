import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import {
  getRoleLandingPath,
  normalizeRoleCode,
} from '@/modules/auth/utils/roleExperience'

export function RequireRoleRoute({
  role,
  children,
}: {
  role: string | readonly string[]
  children: ReactNode
}) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const allowedRoles = Array.isArray(role) ? role : [role]
  if (
    !allowedRoles.some(
      (allowedRole) =>
        normalizeRoleCode(user?.roleCode) === normalizeRoleCode(allowedRole),
    )
  ) {
    const landing = getRoleLandingPath(user)
    /*
     * Protección contra bucles: si la ruta rechazada ES el landing, redirigir
     * a ella misma no terminaría nunca. Hoy no ocurre (el Centro admite los
     * cuatro roles), pero el landing ya no depende del rol y una guarda más
     * estrecha sobre él lo provocaría.
     */
    if (pathname === landing) {
      return (
        <div
          role="alert"
          className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300"
        >
          Su rol no tiene acceso a esta experiencia.
        </div>
      )
    }
    return <Navigate to={landing} replace />
  }
  return children
}
