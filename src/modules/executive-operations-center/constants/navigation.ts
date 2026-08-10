import {
  EXECUTIVE_OPERATIONS_HOME,
  EXECUTIVE_OPERATIONS_ROUTES,
} from '@/modules/executive-operations-center/constants/routes'

export const EXECUTIVE_CENTER_RAIL_ITEM = {
  to: EXECUTIVE_OPERATIONS_HOME,
  label: 'Centro operacional',
  eyebrow: 'Vista ejecutiva',
  icon: 'command' as const,
  end: false,
}

export const EOC_SUB_NAV_ITEMS = [
  {
    to: EXECUTIVE_OPERATIONS_ROUTES.home,
    label: 'Inicio',
    end: true,
  },
  {
    to: EXECUTIVE_OPERATIONS_ROUTES.panorama,
    label: 'Panorama global',
    end: true,
  },
  {
    to: EXECUTIVE_OPERATIONS_ROUTES.inteligencia,
    label: 'Inteligencia IA',
    end: true,
  },
  {
    to: EXECUTIVE_OPERATIONS_ROUTES.reportes,
    label: 'Auditoría',
    end: true,
  },
] as const
