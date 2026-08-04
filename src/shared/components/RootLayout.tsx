// Capa: layout raíz del router.
// Responsabilidad: envolver todas las rutas y alojar overlays de app (splash).

import { Outlet } from 'react-router-dom'
import { PostLoginBootSplash } from '@/shared/components/PostLoginBootSplash'
import { OnboardingProvider } from '@/modules/onboarding/OnboardingContext'
import { OnboardingTour } from '@/modules/onboarding/OnboardingTour'

export function RootLayout() {
  return (
    <OnboardingProvider>
      <Outlet />
      <PostLoginBootSplash />
      <OnboardingTour />
    </OnboardingProvider>
  )
}
