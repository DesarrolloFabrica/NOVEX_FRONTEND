/**
 * Claves de glifo alineadas al catálogo incident_categories.icon.
 */
export type IncidentCategoryIcon =
  | 'infrastructure'
  | 'devices'
  | 'internet'
  | 'apps'
  | 'zoho'
  | 'iceberg'
  | 'acas'
  | 'diplomas'
  | 'tickets'
  | 'other'

export const INCIDENT_CATEGORY_ICON_LABEL: Readonly<
  Record<IncidentCategoryIcon, string>
> = {
  infrastructure: 'Infraestructura',
  devices: 'Equipos',
  internet: 'Internet',
  apps: 'Aplicativos',
  zoho: 'Zoho',
  iceberg: 'Iceberg',
  acas: 'ACAS',
  diplomas: 'Diplomados',
  tickets: 'Tickets',
  other: 'Otro',
}

export const INCIDENT_CATEGORY_ICON_DESCRIPTION: Readonly<
  Record<IncidentCategoryIcon, string>
> = {
  infrastructure: 'Sedes, planta y recursos físicos',
  devices: 'Hardware y dispositivos',
  internet: 'Red, wifi y conectividad',
  apps: 'Sistemas y aplicativos',
  zoho: 'Plataforma Zoho',
  iceberg: 'Plataforma Iceberg',
  acas: 'Plataforma ACAS',
  diplomas: 'Diplomados y programación',
  tickets: 'Mesa de ayuda y tickets',
  other: 'Caso operativo',
}

const ICON_BY_CODE: Readonly<Record<string, IncidentCategoryIcon>> = {
  INFRAESTRUCTURA: 'infrastructure',
  EQUIPOS: 'devices',
  INTERNET: 'internet',
  APLICATIVOS: 'apps',
  ZOHO: 'zoho',
  ICEBERG: 'iceberg',
  ACAS: 'acas',
  DIPLOMADOS: 'diplomas',
  TICKETS: 'tickets',
  PLATFORM_OUTAGE: 'apps',
  TECH_DEGRADATION: 'apps',
  ACADEMIC_INCONSISTENCY: 'diplomas',
  RESOLVED_SERVICE_EVENT: 'tickets',
}

const KNOWN_ICONS = new Set<IncidentCategoryIcon>(
  Object.keys(INCIDENT_CATEGORY_ICON_LABEL) as IncidentCategoryIcon[],
)

export function isIncidentCategoryIcon(
  value: string | null | undefined,
): value is IncidentCategoryIcon {
  return Boolean(value && KNOWN_ICONS.has(value as IncidentCategoryIcon))
}

export function resolveIncidentCategoryIcon(
  code: string,
  name = '',
  icon?: string | null,
): IncidentCategoryIcon {
  if (isIncidentCategoryIcon(icon)) return icon

  const normalizedCode = code.trim().toUpperCase()
  const byCode = ICON_BY_CODE[normalizedCode]
  if (byCode) return byCode

  const token = `${code} ${name}`.toLowerCase()
  if (/internet|wifi|redes|conect/.test(token)) return 'internet'
  if (/zoho/.test(token)) return 'zoho'
  if (/iceberg/.test(token)) return 'iceberg'
  if (/acas/.test(token)) return 'acas'
  if (/diplomad/.test(token)) return 'diplomas'
  if (/ticket|mesa/.test(token)) return 'tickets'
  if (/equipo|hardware|dispositivo/.test(token)) return 'devices'
  if (/infraestructura|sede|mobiliario/.test(token)) return 'infrastructure'
  if (/aplicativ|plataforma|sistema|software/.test(token)) return 'apps'
  return 'other'
}
