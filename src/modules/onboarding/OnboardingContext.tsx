import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import {
  clearOnboardingSituation,
  readOnboardingSituation,
} from './onboardingFirstSituation'
import { getOnboardingSteps } from './onboardingTourSteps'

interface OnboardingContextValue {
  active: boolean
  stepIndex: number
  steps: ReturnType<typeof getOnboardingSteps>
  next: () => void
  previous: () => void
  pause: () => void
  skip: () => void
  restart: () => void
  resume: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    bootSplashActive,
    completeOnboarding,
    saveOnboardingProgress,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role = normalizeRoleCode(user?.roleCode)
  const steps = useMemo(() => getOnboardingSteps(role), [role])
  const storageKey = `novex.onboarding.v2.${user?.id ?? 'anonymous'}`
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(() =>
    Math.max(0, user?.onboardingStep ?? 0),
  )
  const autoStartedForUserRef = useRef<string | null>(null)
  const autoStartTimerRef = useRef<number | null>(null)

  const goTo = useCallback(
    (index: number, persist = true) => {
      const bounded = Math.max(0, Math.min(steps.length - 1, index))
      setStepIndex(bounded)
      if (persist) {
        try {
          localStorage.setItem(storageKey, String(bounded))
        } catch {
          /* privado */
        }
        void saveOnboardingProgress(bounded)
      }
      const route = steps[bounded]?.route
      const situationId = readOnboardingSituation(user?.id)
      const destination =
        route === '/gestion' && situationId
          ? `/gestion?situation=${encodeURIComponent(situationId)}`
          : route
      const currentLocation = `${location.pathname}${location.search}`
      const shouldNavigate = destination?.includes('?')
        ? currentLocation !== destination
        : location.pathname !== destination
      if (destination && shouldNavigate) navigate(destination)
    },
    [
      location.pathname,
      location.search,
      navigate,
      saveOnboardingProgress,
      steps,
      storageKey,
      user?.id,
    ],
  )

  const finish = useCallback(() => {
    setActive(false)
    void (async () => {
      try {
        await completeOnboarding()
        try {
          localStorage.setItem(storageKey, 'completed')
        } catch {
          /* privado */
        }
        clearOnboardingSituation(user?.id)
      } catch {
        // Si falla el backend, no marcar como completado en local:
        // el tour podrá reanudarse y no se pierde el gate institucional.
      }
    })()
  }, [completeOnboarding, storageKey, user?.id])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish()
      return
    }
    goTo(stepIndex + 1)
  }, [finish, goTo, stepIndex, steps.length])

  const previous = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex])
  const pause = useCallback(() => setActive(false), [])
  const skip = finish
  const resume = useCallback(() => {
    if (steps.length === 0) return
    if (user?.id) autoStartedForUserRef.current = user.id
    setActive(true)
    const currentStep = steps[stepIndex]
    if (
      currentStep?.advanceOnTarget &&
      document.querySelector(currentStep.advanceOnTarget)
    ) {
      goTo(stepIndex + 1)
      return
    }
    goTo(stepIndex)
  }, [goTo, stepIndex, steps, user?.id])
  const restart = useCallback(() => {
    if (steps.length === 0) return
    if (user?.id) autoStartedForUserRef.current = user.id
    setActive(true)
    setStepIndex(0)
    try {
      localStorage.setItem(storageKey, '0')
    } catch {
      /* privado */
    }
    void saveOnboardingProgress(0, false)
    const firstRoute = steps[0]?.route ?? '/'
    if (location.pathname !== firstRoute) navigate(firstRoute)
  }, [
    location.pathname,
    navigate,
    saveOnboardingProgress,
    steps,
    storageKey,
    user?.id,
  ])

  useEffect(() => {
    // El provider sobrevive al logout. Liberar esta marca permite que el mismo
    // usuario reanude automáticamente el recorrido al iniciar otra sesión.
    if (!isAuthenticated) autoStartedForUserRef.current = null
  }, [isAuthenticated])

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user ||
      user.onboardingCompleted ||
      bootSplashActive ||
      active
    )
      return
    if (autoStartedForUserRef.current === user.id) return
    if (autoStartTimerRef.current !== null) return

    // Roles sin recorrido (ADMIN): cerrar el gate sin overlay.
    if (steps.length === 0) {
      autoStartedForUserRef.current = user.id
      void (async () => {
        try {
          await completeOnboarding()
          try {
            localStorage.setItem(storageKey, 'completed')
          } catch {
            /* privado */
          }
        } catch {
          /* reintentará en la próxima sesión */
        }
      })()
      return
    }

    let local: string | null = null
    try {
      local = localStorage.getItem(storageKey)
    } catch {
      /* privado */
    }
    // Solo el backend es fuente de verdad para omitir el tour.
    // Si local dice completed pero el usuario aún no completó en servidor,
    // limpiamos el espejo local y reanudamos el recorrido.
    if (local === 'completed') {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        /* privado */
      }
      local = null
    }
    const saved =
      local && /^\d+$/.test(local) ? Number(local) : user.onboardingStep
    const timer = window.setTimeout(() => {
      if (autoStartTimerRef.current !== timer) return
      autoStartTimerRef.current = null
      autoStartedForUserRef.current = user.id
      setActive(true)
      // Navega a la ruta del paso guardado (crítico para DIRECTOR/ANALISTA).
      // Mostrar/reanudar el paso guardado no es un avance nuevo. Evitar esta
      // escritura también elimina una carrera con "Omitir recorrido".
      goTo(Math.min(Math.max(0, saved), steps.length - 1), false)
    }, 500)
    autoStartTimerRef.current = timer

    return () => {
      window.clearTimeout(timer)
      if (autoStartTimerRef.current === timer) {
        autoStartTimerRef.current = null
      }
    }
  }, [
    active,
    bootSplashActive,
    completeOnboarding,
    goTo,
    isAuthenticated,
    steps.length,
    storageKey,
    user,
  ])

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      steps,
      next,
      previous,
      pause,
      skip,
      restart,
      resume,
    }),
    [active, next, pause, previous, restart, resume, skip, stepIndex, steps],
  )
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext)
  if (!value)
    throw new Error('useOnboarding debe usarse dentro de OnboardingProvider.')
  return value
}
