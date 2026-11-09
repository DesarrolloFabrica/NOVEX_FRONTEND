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
import { planTourSteps } from './engine/tourPlan'
import { evaluateTourPredicate, legacyAdvancePredicate } from './engine/tourPredicates'
import {
  decideTourStart,
  writeTourProgress,
  type TourOutcome,
} from './engine/tourProgress'

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

/**
 * RECORRIDO SUSPENDIDO (fase 1 de retiro del shell legacy).
 *
 * Los pasos actuales apuntan a objetivos que ya no existen: el del DIRECTOR
 * vive en `/dashboard` (retirado) y los de ANALISTA/COORDINADOR buscan
 * `data-tour` que el Centro Operacional no tiene. Mostrarlo llevaba al usuario
 * fuera del circo o lo dejaba en «objetivo no encontrado».
 *
 * Mientras esté en `true`:
 * - no hay arranque automático ni overlay, para ningún rol;
 * - el menú de usuario no ofrece el tutorial (`steps` se expone vacío);
 * - NO se escribe nada: ni `PATCH /users/me/onboarding` ni localStorage.
 *   El estado persistido (`onboardingStep`, `onboardingCompleted`) queda
 *   intacto para cuando exista un recorrido nuevo sobre el escenario.
 *
 * Ojo: no basta con vaciar los pasos. Un rol sin pasos se trata como ADMIN y
 * se marca como completado en backend; por eso el arranque se corta antes.
 */
const ONBOARDING_TOUR_SUSPENDED = true

const NO_STEPS: ReturnType<typeof getOnboardingSteps> = []

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
  const permissions = user?.permissions
  // Filtra por rol y permisos: un paso no autorizado nunca llega al motor.
  const steps = useMemo(
    () =>
      ONBOARDING_TOUR_SUSPENDED
        ? NO_STEPS
        : planTourSteps(getOnboardingSteps(role), { permissions: permissions ?? [] }, role),
    [permissions, role],
  )
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
        if (user?.id) writeTourProgress(user.id, 'in-progress', bounded)
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
      user?.id,
    ],
  )

  /**
   * Cierre del recorrido. La omisión y la finalización se registran por
   * separado en localStorage (versión v3). El backend solo distingue
   * «completado», así que ambas llaman a `completeOnboarding`.
   */
  const finish = useCallback(
    (outcome: Extract<TourOutcome, 'completed' | 'skipped'>, index: number) => {
      setActive(false)
      void (async () => {
        try {
          await completeOnboarding()
          if (user?.id) writeTourProgress(user.id, outcome, index)
          clearOnboardingSituation(user?.id)
        } catch {
          // Sin confirmación del backend el progreso queda en curso: el
          // recorrido podrá reanudarse y no se pierde el gate institucional.
          if (user?.id) writeTourProgress(user.id, 'in-progress', index)
        }
      })()
    },
    [completeOnboarding, user?.id],
  )

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish('completed', stepIndex)
      return
    }
    goTo(stepIndex + 1)
  }, [finish, goTo, stepIndex, steps.length])

  const previous = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex])
  const pause = useCallback(() => setActive(false), [])
  const skip = useCallback(
    () => finish('skipped', stepIndex),
    [finish, stepIndex],
  )
  const resume = useCallback(() => {
    if (steps.length === 0) return
    if (user?.id) autoStartedForUserRef.current = user.id
    setActive(true)
    const currentStep = steps[stepIndex]
    // Un paso cuyo estado ya se cumple se da por realizado; se comprueba el
    // estado, no la mera existencia del ancla.
    const condition =
      currentStep?.advanceWhen ?? legacyAdvancePredicate(currentStep ?? {})
    if (condition && evaluateTourPredicate(condition)) {
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
    if (user?.id) writeTourProgress(user.id, 'in-progress', 0)
    void saveOnboardingProgress(0, false)
    const firstRoute = steps[0]?.route ?? '/'
    if (location.pathname !== firstRoute) navigate(firstRoute)
  }, [
    location.pathname,
    navigate,
    saveOnboardingProgress,
    steps,
    user?.id,
  ])

  useEffect(() => {
    // El provider sobrevive al logout. Liberar esta marca permite que el mismo
    // usuario reanude automáticamente el recorrido al iniciar otra sesión.
    if (!isAuthenticated) autoStartedForUserRef.current = null
  }, [isAuthenticated])

  useEffect(() => {
    if (ONBOARDING_TOUR_SUSPENDED) return
    if (
      !isAuthenticated ||
      !user ||
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
          writeTourProgress(user.id, 'completed', 0)
        } catch {
          /* reintentará en la próxima sesión */
        }
      })()
      return
    }

    // Decisión por versión. El registro de la versión actual manda; quien
    // completó el tutorial anterior recibe el renovado. La clave v2 no se lee
    // para decidir ni se borra: queda como historial.
    const decision = decideTourStart(user.id)
    if (!decision.shouldPresent) return
    const saved = decision.stepIndex
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
