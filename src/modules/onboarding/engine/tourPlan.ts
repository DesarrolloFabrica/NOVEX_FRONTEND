import { hasPermission } from '@/modules/auth/utils/permissions'
import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import type { TourPredicate } from './tourPredicates'

/**
 * Requisitos declarables por paso. Ningún paso existente los usa todavía: el
 * filtrado solo afecta a los que los declaren.
 */
export interface TourStepRequirements {
  /** Permisos que el usuario debe tener TODOS para ver el paso. */
  requires?: string[]
  /** Roles que pueden ver el paso. Ausente = cualquier rol del recorrido. */
  roles?: NovexRoleCode[]
  /**
   * Paso opcional: si su ancla no aparece, el globo ofrece continuar sin él
   * con una acción explícita del usuario. Nunca se omite en silencio.
   */
  optional?: boolean
  /**
   * `info`: se avanza con «Siguiente». `action`: avanza cuando `advanceWhen`
   * se cumple. `wait`: solo espera a que el ancla esté disponible.
   */
  kind?: 'info' | 'action' | 'wait'
  /** Estado verificable que confirma la interacción del usuario. */
  advanceWhen?: TourPredicate
  /**
   * `external`: el usuario debe interactuar con componentes fuera del área
   * resaltada; el velo deja pasar los clics. `none` (por defecto) los bloquea.
   */
  interaction?: 'none' | 'external'
}

export interface TourUser {
  permissions: string[]
}

export function isStepAuthorized(
  step: TourStepRequirements,
  user: TourUser | null | undefined,
  role: NovexRoleCode,
): boolean {
  if (step.roles && !step.roles.includes(role)) return false
  if (!step.requires || step.requires.length === 0) return true
  if (!user) return false
  return step.requires.every((permission) => hasPermission(user, permission))
}

/** Devuelve solo los pasos que el usuario puede ver, conservando su orden. */
export function planTourSteps<T extends TourStepRequirements>(
  steps: readonly T[],
  user: TourUser | null | undefined,
  role: NovexRoleCode,
): T[] {
  return steps.filter((step) => isStepAuthorized(step, user, role))
}
