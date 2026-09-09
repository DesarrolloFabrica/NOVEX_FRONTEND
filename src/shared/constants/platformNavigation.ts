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
 * NO se confunda con `EOC_SUB_NAV_ITEMS`: esas son las SECCIONES internas del
 * Centro Operacional (Inicio, Panorama, IA, Auditoría) y viven en su módulo.
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

const OPERATIONAL_NAV_ITEMS: readonly PlatformNavItem[] = [
  {
    to: '/situaciones',
    label: 'Situaciones registradas',
    eyebrow: 'Historial operativo',
    icon: 'events',
    end: true,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    eyebrow: 'Visión general',
    icon: 'intelligence',
    end: true,
  },
  {
    to: '/red-impacto',
    label: 'Red de impacto',
    eyebrow: 'Mapa operacional',
    icon: 'impact',
    end: true,
  },
  {
    to: '/gestion',
    label: 'Gestión de situaciones',
    eyebrow: 'Ciclo operativo',
    icon: 'monitoring',
  },
]

const DIRECTOR_NAV_ITEMS: readonly PlatformNavItem[] = [
  EXECUTIVE_CENTER_RAIL_ITEM,
  ...OPERATIONAL_NAV_ITEMS.filter((item) => item.to !== '/gestion'),
]

const ANALISTA_NAV_ITEMS: readonly PlatformNavItem[] = [
  EXECUTIVE_CENTER_RAIL_ITEM,
  ...OPERATIONAL_NAV_ITEMS,
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
  ...OPERATIONAL_NAV_ITEMS.filter((item) => item.to !== '/gestion'),
]

/**
 * Destinos de plataforma para un rol. Réplica exacta del reparto que el carril
 * aplicaba antes de R2: un rol desconocido cae en la lista operativa, igual
 * que cuando el carril usaba `user?.roleCode ?? 'COORDINADOR'`.
 */
export function resolvePlatformNavItems(
  roleCode: string | undefined,
): readonly PlatformNavItem[] {
  switch (roleCode ?? 'COORDINADOR') {
    case 'ADMIN':
      return ADMIN_NAV_ITEMS
    case 'DIRECTOR':
      return DIRECTOR_NAV_ITEMS
    case 'ANALISTA':
      return ANALISTA_NAV_ITEMS
    default:
      return OPERATIONAL_NAV_ITEMS
  }
}
