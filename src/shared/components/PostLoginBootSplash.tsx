// Capa: componente compartido (host del splash post-login).
// Responsabilidad: montar NovexBootSplash a nivel de router para que no se
// desmonte con LoginPage.

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { NovexBootSplash } from '@/shared/components/NovexBootSplash'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'

export function PostLoginBootSplash() {
  const { bootSplashActive, endBootSplash, user } = useAuth()
  const navigate = useNavigate()

  const handleEnter = useCallback(() => {
    navigate(getRoleLandingPath(user), { replace: true })
  }, [navigate, user])

  if (!bootSplashActive) return null

  return (
    <NovexBootSplash
      ready
      onEnter={handleEnter}
      onComplete={endBootSplash}
    />
  )
}
