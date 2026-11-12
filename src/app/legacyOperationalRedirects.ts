// Desde el archivo de constantes, NO desde el barrel del módulo: el barrel
// re-exporta el layout y las páginas legacy y los metía en el bundle de entrada
// (el login descargaba el Centro antiguo).
import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/executive-operations-center/constants/routes'

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
