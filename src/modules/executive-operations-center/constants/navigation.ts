import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import {
  EXECUTIVE_OPERATIONS_HOME,
  EXECUTIVE_OPERATIONS_ROUTES,
  OPERATIONAL_SHELL_ROLES,
} from '@/modules/executive-operations-center/constants/routes'

export const EXECUTIVE_CENTER_RAIL_ITEM = {
  to: EXECUTIVE_OPERATIONS_HOME,
  label: 'Centro operacional',
  eyebrow: 'Vista ejecutiva',
  icon: 'command' as const,
  end: false,
}

/**
 * Cada pestaña declara QUIÉN puede abrirla, con la misma constante que usa la
 * guarda de su ruta. Sin esto, el coordinador veía las cuatro y tres de ellas
 * lo devolvían a su landing: un enlace visible que no lleva a ninguna parte es
 * peor que no ofrecerlo.
 */
/*
 * FASE 1: Panorama global, Inteligencia IA y Auditoría se retiraron como
 * pestañas (sus rutas redirigen al Centro). El chrome ya no pinta secciones;
 * la lista conserva solo el Centro para quien aún la consulte.
 */
export const EOC_SUB_NAV_ITEMS = [
  {
    to: EXECUTIVE_OPERATIONS_ROUTES.home,
    label: 'Inicio',
    end: true,
    roles: OPERATIONAL_SHELL_ROLES,
  },
] as const

/** Pestañas que un rol puede abrir de verdad. */
export function visibleSubNavItems(
  role: NovexRoleCode | undefined,
): typeof EOC_SUB_NAV_ITEMS[number][] {
  if (!role) return []
  return EOC_SUB_NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(role),
  )
}
