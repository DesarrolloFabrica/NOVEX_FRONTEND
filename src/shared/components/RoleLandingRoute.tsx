import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'

export function RoleLandingRoute() {
  const { user } = useAuth()
  return <Navigate to={getRoleLandingPath(user)} replace />
}
