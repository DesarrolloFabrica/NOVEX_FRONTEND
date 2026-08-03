// Capa: componente compartido (host del splash post-login).
// Responsabilidad: montar NovexBootSplash a nivel de router para que no se
// desmonte con LoginPage.

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { NovexBootSplash } from '@/shared/components/NovexBootSplash'

export function PostLoginBootSplash() {
  const { bootSplashActive, endBootSplash } = useAuth()
  const navigate = useNavigate()

  const handleEnter = useCallback(() => {
    navigate('/red-impacto', { replace: true })
  }, [navigate])

  if (!bootSplashActive) return null

  return (
    <NovexBootSplash
      ready
      onEnter={handleEnter}
      onComplete={endBootSplash}
    />
  )
}
