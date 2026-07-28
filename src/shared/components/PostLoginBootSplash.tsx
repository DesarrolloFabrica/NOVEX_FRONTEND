// Capa: componente compartido (host del splash post-login).
// Responsabilidad: montar CunmarkBootSplash a nivel de router para que no se
// desmonte con LoginPage. Prefarga datos operacionales para evitar un segundo loader.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useOperationalEvents } from '@/modules/operational-events/hooks/useOperationalEvents'
import { CunmarkBootSplash } from '@/shared/components/CunmarkBootSplash'

export function PostLoginBootSplash() {
  const { bootSplashActive, endBootSplash } = useAuth()
  const { loadOperationalEvents } = useOperationalEvents()
  const navigate = useNavigate()
  const [prefetchDone, setPrefetchDone] = useState(false)

  useEffect(() => {
    if (!bootSplashActive) {
      setPrefetchDone(false)
      return
    }

    let cancelled = false
    void loadOperationalEvents().finally(() => {
      if (!cancelled) setPrefetchDone(true)
    })

    return () => {
      cancelled = true
    }
  }, [bootSplashActive, loadOperationalEvents])

  const handleEnter = useCallback(() => {
    navigate('/dashboard', { replace: true })
  }, [navigate])

  if (!bootSplashActive) return null

  return (
    <CunmarkBootSplash
      ready={prefetchDone}
      onEnter={handleEnter}
      onComplete={endBootSplash}
    />
  )
}
