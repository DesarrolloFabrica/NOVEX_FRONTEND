// Capa: app (enrutado).
// Responsabilidad: componentes diferidos de cada destino (un chunk por destino,
// ver `routeChunks`). Vive aparte de `router.tsx` para que el fast refresh de
// Vite siga funcionando: un archivo que exporta el router no debe declarar
// componentes.

import { lazy, Suspense, type ReactNode } from 'react'
import { RouteFallback } from '@/shared/components/RouteFallback'
import {
  loadAdminConsolePage,
  loadLoginPage,
  loadOperationalCenter,
} from '@/app/routeChunks'

export const LoginPage = lazy(() =>
  loadLoginPage().then((m) => ({ default: m.LoginPage })),
)

export const AdminConsolePage = lazy(() =>
  loadAdminConsolePage().then((m) => ({ default: m.AdminConsolePage })),
)

export const ExecutiveOperationsLayout = lazy(() =>
  loadOperationalCenter().then((m) => ({ default: m.ExecutiveOperationsLayout })),
)

export const OperationalCenterHome = lazy(() =>
  loadOperationalCenter().then((m) => ({ default: m.OperationalCenterHome })),
)

/** Frontera de carga a pantalla completa para un destino diferido. */
export function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}
