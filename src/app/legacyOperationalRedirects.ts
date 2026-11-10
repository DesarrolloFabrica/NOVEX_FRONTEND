import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/executive-operations-center'

/**
 * Rutas legadas del Centro Operacional que deben redirigir SIN montar el
 * layout/proveedor ejecutivo (FE-04). Declaradas como hermanas de la home.
 */
export const LEGACY_EXECUTIVE_SECTION_REDIRECTS = [
  `${EXECUTIVE_OPERATIONS_HOME}/panorama`,
  `${EXECUTIVE_OPERATIONS_HOME}/inteligencia`,
  `${EXECUTIVE_OPERATIONS_HOME}/reportes`,
] as const

export const LEGACY_PLATFORM_REDIRECTS = [
  '/dashboard',
  '/red-impacto',
  '/situaciones',
  '/gestion',
  '/intelligence',
  '/operational-events',
  '/situation-management',
  '/legacy-monitoring',
] as const
