import { createContext, useContext } from 'react'
import type { getOnboardingSteps } from './onboardingTourSteps'

/*
 * Contexto y hook del onboarding, separados del proveedor. Con todo en
 * `OnboardingContext.tsx`, la recarga en caliente de Vite recreaba el contexto
 * al editar el archivo y el proveedor y sus consumidores quedaban con objetos
 * distintos («useOnboarding debe usarse dentro de OnboardingProvider»).
 */
export interface OnboardingContextValue {
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

export const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext)
  if (!value)
    throw new Error('useOnboarding debe usarse dentro de OnboardingProvider.')
  return value
}
