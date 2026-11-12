import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import {
  resolveOperationalCenterExperience,
  type OperationalCenterExperienceId,
} from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import { loadOperationalShell } from '@/modules/operational-cards/experience/shells/operationalShellChunks'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'
import '@/styles/operational-problem-dossier.css'
import '@/styles/operational-shell-admin.css'
import '@/styles/operational-shell-coordinator.css'

/**
 * Un componente diferido por shell, creado una sola vez a nivel de módulo
 * (crearlo en el render reiniciaría el shell en cada pintado).
 */
const SHELLS: Record<OperationalCenterExperienceId, LazyExoticComponent<ComponentType>> = {
  director: lazy(() => loadOperationalShell('director')),
  analyst: lazy(() => loadOperationalShell('analyst')),
  coordinator: lazy(() => loadOperationalShell('coordinator')),
  admin: lazy(() => loadOperationalShell('admin')),
}

/**
 * Punto de entrada del Centro Operacional: elige el shell por rol.
 * Sustituye el monolito OperationalShellV2.
 *
 * Cada shell es su propio chunk: un rol no descarga el código de los demás.
 * El fallback es vacío a propósito: la sala (escena y marco) ya está pintada
 * por el layout y el chunk suele estar precargado en paralelo a la sesión.
 */
export function OperationalCenterHome() {
  const { user } = useAuth()
  const experience = resolveOperationalCenterExperience(
    normalizeRoleCode(user?.roleCode),
  )
  const Shell = SHELLS[experience]

  return (
    <Suspense fallback={null}>
      <Shell />
    </Suspense>
  )
}
