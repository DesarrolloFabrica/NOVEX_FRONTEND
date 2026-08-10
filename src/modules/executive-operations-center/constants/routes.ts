import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

export const EXECUTIVE_OPERATIONS_HOME = '/centro-operacional'

export const EXECUTIVE_OPERATIONS_ROUTES = {
  home: EXECUTIVE_OPERATIONS_HOME,
  panorama: `${EXECUTIVE_OPERATIONS_HOME}/panorama`,
  inteligencia: `${EXECUTIVE_OPERATIONS_HOME}/inteligencia`,
  reportes: `${EXECUTIVE_OPERATIONS_HOME}/reportes`,
} as const

export const EXECUTIVE_ROLES: readonly NovexRoleCode[] = [
  'ADMIN',
  'DIRECTOR',
  'ANALISTA',
]
