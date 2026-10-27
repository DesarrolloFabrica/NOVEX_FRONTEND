import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

/**
 * Experiencia de composición del Centro Operacional.
 *
 * Vive arriba del árbol a propósito: el rol elige SHELL, no decenas de
 * `role ===` dentro de paneles o de la baraja. Los KPIs futuros deben colgar
 * de un alcance (`KpiAccess`), no de este id: aquí solo se separa la
 * composición visual y las capacidades de operación.
 */
export type OperationalCenterExperienceId =
  | 'director'
  | 'analyst'
  | 'coordinator'
  | 'admin'

export function resolveOperationalCenterExperience(
  role: NovexRoleCode,
): OperationalCenterExperienceId {
  switch (role) {
    case 'DIRECTOR':
      return 'director'
    case 'ANALISTA':
      return 'analyst'
    case 'COORDINADOR':
      return 'coordinator'
    case 'ADMIN':
      return 'admin'
  }
}

/**
 * ¿Este shell opera el ciclo de vida (reportar / avanzar / resolver)?
 *
 * DIRECTOR y ADMIN consultan. ANALISTA y COORDINADOR operan según permisos.
 * No sustituye al backend: solo evita cablear escrituras en shells de lectura.
 */
export function experienceAllowsOperation(
  experience: OperationalCenterExperienceId,
): boolean {
  return experience === 'analyst' || experience === 'coordinator'
}
