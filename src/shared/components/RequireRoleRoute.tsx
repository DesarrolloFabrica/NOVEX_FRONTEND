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
  role: string
  children: ReactNode
}) {
  const { user } = useAuth()
  if (normalizeRoleCode(user?.roleCode) !== normalizeRoleCode(role)) {
    return <Navigate to={getRoleLandingPath(user)} replace />
  }
  return children
}
