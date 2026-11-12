import type { ComponentType } from 'react'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import {
  resolveOperationalCenterExperience,
  type OperationalCenterExperienceId,
} from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'

/**
 * Un chunk por shell de rol.
 *
 * Antes `OperationalCenterHome` importaba los cuatro shells de forma estática:
 * cualquier rol descargaba también el del DIRECTOR (paneles KPI + ECharts,
 * ~1 MB sin comprimir). Ahora cada rol baja solo el suyo.
 *
 * Las promesas se memorizan: `preloadOperationalShellForRole` puede arrancar la
 * descarga en paralelo a la validación de sesión (ver `src/app/routeChunks`) y
 * `React.lazy` reutiliza la misma petición, sin cascada.
 */
type ShellModule = { default: ComponentType }

const LOADERS: Record<OperationalCenterExperienceId, () => Promise<ShellModule>> = {
  director: () =>
    import('@/modules/operational-cards/experience/shells/DirectorOperationalShell').then(
      (m) => ({ default: m.DirectorOperationalShell }),
    ),
  analyst: () =>
    import('@/modules/operational-cards/experience/shells/AnalystOperationalShell').then(
      (m) => ({ default: m.AnalystOperationalShell }),
    ),
  coordinator: () =>
    import('@/modules/operational-cards/experience/shells/CoordinatorOperationalShell').then(
      (m) => ({ default: m.CoordinatorOperationalShell }),
    ),
  admin: () =>
    import('@/modules/operational-cards/experience/shells/AdminOperationalShell').then(
      (m) => ({ default: m.AdminOperationalShell }),
    ),
}

const pending = new Map<OperationalCenterExperienceId, Promise<ShellModule>>()

export function loadOperationalShell(
  experience: OperationalCenterExperienceId,
): Promise<ShellModule> {
  let promise = pending.get(experience)
  if (!promise) {
    promise = LOADERS[experience]()
    // Un fallo de red no debe quedar memorizado: el siguiente intento reintenta.
    promise.catch(() => pending.delete(experience))
    pending.set(experience, promise)
  }
  return promise
}

/** Arranca (sin esperar) la descarga del shell del rol indicado. */
export function preloadOperationalShellForRole(roleCode: string | null | undefined): void {
  if (!roleCode) return
  const experience = resolveOperationalCenterExperience(normalizeRoleCode(roleCode))
  loadOperationalShell(experience).catch(() => undefined)
}
