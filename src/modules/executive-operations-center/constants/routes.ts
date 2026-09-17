import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

export const EXECUTIVE_OPERATIONS_HOME = '/centro-operacional'

export const EXECUTIVE_OPERATIONS_ROUTES = {
  home: EXECUTIVE_OPERATIONS_HOME,
  panorama: `${EXECUTIVE_OPERATIONS_HOME}/panorama`,
  inteligencia: `${EXECUTIVE_OPERATIONS_HOME}/inteligencia`,
  reportes: `${EXECUTIVE_OPERATIONS_HOME}/reportes`,
} as const

/**
 * Roles del CONJUNTO EJECUTIVO: panorama, inteligencia y reportes.
 *
 * NO se amplía para dar entrada al coordinador. Esta constante la comparten las
 * secciones hijas del Centro Operacional, y añadirle un rol aquí le abriría
 * todas ellas de golpe en lugar de solo la pantalla que necesita.
 */
export const EXECUTIVE_ROLES: readonly NovexRoleCode[] = [
  'ADMIN',
  'DIRECTOR',
  'ANALISTA',
]

/**
 * Roles que pueden usar la EXPERIENCIA OPERACIONAL (la home del Centro
 * Operacional: cartas, personaje, mis reportes y el panel de reporte/solución).
 *
 * Incluye al COORDINADOR, y solo a esta pantalla: es el único rol que puede
 * SOLUCIONAR un problema, así que dejarlo fuera hacía inalcanzable la mitad del
 * flujo. Las secciones ejecutivas hijas siguen gobernadas por
 * `EXECUTIVE_ROLES` y no cambian.
 */
export const OPERATIONAL_SHELL_ROLES: readonly NovexRoleCode[] = [
  ...EXECUTIVE_ROLES,
  'COORDINADOR',
]
