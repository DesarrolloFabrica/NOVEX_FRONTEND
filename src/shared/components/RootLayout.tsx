// Capa: layout raíz del router.
// Responsabilidad: envolver todas las rutas y alojar overlays de app (transición post-login).

import { Outlet } from 'react-router-dom'
import { PostLoginCurtainTransition } from '@/shared/components/PostLoginCurtainTransition'
import { OnboardingProvider } from '@/modules/onboarding/OnboardingContext'
import { OnboardingTour } from '@/modules/onboarding/OnboardingTour'
import { PostLoginTransitionCueProvider } from '@/shared/transition/PostLoginTransitionCueProvider'

export function RootLayout() {
  return (
    <OnboardingProvider>
      <PostLoginTransitionCueProvider>
        <Outlet />
        <PostLoginCurtainTransition />
      </PostLoginTransitionCueProvider>
      <OnboardingTour />
    </OnboardingProvider>
  )
}
