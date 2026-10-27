import { EXECUTIVE_CENTER_RAIL_ITEM } from '@/modules/executive-operations-center/constants/navigation'

/**
 * Navegación de PLATAFORMA: los destinos que llevan de una experiencia a otra.
 *
 * Extraído de `NovexSystemRail` en R2, sin cambiar ni un destino ni un rótulo.
 * Existe porque desde R2 hay DOS superficies que la pintan:
 *
 * - el carril vertical (`NovexSystemRail`), en las experiencias que lo
 *   conservan;
 * - el menú compacto (`NovexPlatformMenu`), en el Centro Operacional, que ya
 *   no monta el carril.
 *
 * Tener el reparto por rol en un solo sitio evita que las dos superficies
 * ofrezcan destinos distintos al mismo usuario, que es la forma habitual en la
 * que una navegación duplicada se desincroniza.
 *
 * FASE 1 — retiro de la navegación legacy. Situaciones registradas, Dashboard,
 * Red de impacto y Gestión de situaciones dejaron de ser destinos: sus rutas
 * redirigen al Centro Operacional. Ni el carril ni el menú Plataforma se montan
 * ya en ninguna pantalla; la única superficie que lee esta lista es el menú de
 * usuario (`NovexUserMenu`), que ofrece al ADMIN el paso entre el Centro y la
 * Administración.
 *
 * NO se confunda con `EOC_SUB_NAV_ITEMS`: esas son las SECCIONES internas del
 * Centro Operacional y viven en su módulo.
 */

export type PlatformNavIcon =
  | 'intelligence'
  | 'impact'
  | 'events'
  | 'monitoring'
  | 'admin'
  | 'command'
  | 'logout'
  | 'grid'

export interface PlatformNavItem {
  to: string
  label: string
  eyebrow: string
  icon: PlatformNavIcon
  end?: boolean
}

/** Todos los roles: el Centro Operacional (antes faltaba al COORDINADOR). */
const OPERATIONAL_NAV_ITEMS: readonly PlatformNavItem[] = [
  EXECUTIVE_CENTER_RAIL_ITEM,
]

const ADMIN_NAV_ITEMS: readonly PlatformNavItem[] = [
  {
    to: '/admin',
    label: 'Administración',
    eyebrow: 'Control del sistema',
    icon: 'admin',
    end: true,
  },
  EXECUTIVE_CENTER_RAIL_ITEM,
]

/**
 * Destinos de plataforma para un rol. Un rol desconocido cae en la lista
 * operativa, igual que cuando el carril usaba `user?.roleCode ?? 'COORDINADOR'`.
 */
export function resolvePlatformNavItems(
  roleCode: string | undefined,
): readonly PlatformNavItem[] {
  return roleCode === 'ADMIN' ? ADMIN_NAV_ITEMS : OPERATIONAL_NAV_ITEMS
}
