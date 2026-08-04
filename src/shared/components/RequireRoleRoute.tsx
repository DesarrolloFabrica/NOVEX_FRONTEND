import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
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
  const allowedRoles = Array.isArray(role) ? role : [role]
  if (
    !allowedRoles.some(
      (allowedRole) =>
        normalizeRoleCode(user?.roleCode) === normalizeRoleCode(allowedRole),
    )
  ) {
    return <Navigate to={getRoleLandingPath(user)} replace />
  }
  return children
}
