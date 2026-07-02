// Capa: dominio (tipos) del módulo "auth".
// Responsabilidad: describir al usuario autenticado y su rol.
// Sin lógica: contrato consumido por context/services/hooks de autenticación.

/**
 * Rol del usuario dentro del Centro de Monitoreo.
 * - supervisor: valida compromisos y observa la salud global.
 * - ejecutor: gestiona los compromisos de su área seleccionada.
 */
export type UserRole = 'supervisor' | 'ejecutor'

/** Usuario autenticado en O.M.E.G.A. */
export interface User {
  /** Identificador estable e interno del usuario. */
  id: string
  /** Nombre visible del usuario. */
  name: string
  /** Rol que determina permisos y vistas disponibles. */
  role: UserRole
  /** Área seleccionada (relevante sobre todo para el rol ejecutor). */
  selectedAreaId?: string
}
