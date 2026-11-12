import type { AdminAuditLogItem } from '@/modules/api/admin.api'

/** Etiquetas de las acciones auditadas (backend: `AuditAction`). */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  SITUATION_CREATED: 'Situación registrada',
  SITUATION_UPDATED: 'Situación editada',
  SITUATION_STATUS_CHANGED: 'Cambio de estado de situación',
  SITUATION_RESOLVED: 'Situación resuelta',
  SITUATION_CONSEQUENCE_ADDED: 'Afectación añadida',
  SITUATION_SEVERITY_ESCALATED: 'Severidad escalada',
  SITUATION_CANCELLED: 'Situación anulada',
  SITUATION_COORDINATION_TRANSFERRED: 'Situación trasladada',
  SITUATION_EVIDENCE_ADDED: 'Evidencia añadida',
  SITUATION_EVIDENCE_DELETED: 'Evidencia eliminada',
  SITUATION_EVIDENCE_RETIRED: 'Evidencia retirada',
  AI_ANALYSIS_COMPLETED: 'Análisis IA completado',
  AI_REANALYZED: 'Análisis IA repetido',
  AI_ANALYSIS_FAILED: 'Análisis IA fallido',
  USER_CREATED: 'Usuario creado',
  USER_ROLE_CHANGED: 'Rol de usuario cambiado',
  USER_ACTIVATED: 'Usuario activado',
  USER_DEACTIVATED: 'Usuario desactivado',
  USER_COORDINATION_CHANGED: 'Coordinación de usuario cambiada',
  USER_PROFILE_UPDATED: 'Perfil de usuario editado',
  ROLE_UPDATED: 'Rol editado',
  ROLE_ACTIVATED: 'Rol activado',
  ROLE_DEACTIVATED: 'Rol desactivado',
  ROLE_PERMISSIONS_CHANGED: 'Permisos de rol cambiados',
  COORDINATION_CREATED: 'Coordinación creada',
  COORDINATION_UPDATED: 'Coordinación editada',
  COORDINATION_ACTIVATED: 'Coordinación activada',
  COORDINATION_DEACTIVATED: 'Coordinación desactivada',
}

export const AUDIT_RESOURCE_LABEL: Record<string, string> = {
  situation: 'Situación',
  user: 'Usuario',
  ai_analysis: 'Análisis IA',
  role: 'Rol',
  coordination: 'Coordinación',
}

const FIELD_LABEL: Record<string, string> = {
  name: 'nombre',
  shortName: 'nombre corto',
  description: 'descripción',
  color: 'color',
  displayOrder: 'orden',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'activo',
  INACTIVE: 'inactivo',
  OPEN: 'abierta',
  IN_PROGRESS: 'en atención',
  RESOLVED: 'resuelta',
  CLOSED: 'cerrada',
  CANCELLED: 'anulada',
}

const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

/**
 * Resumen legible de los metadatos. El backend solo guarda códigos, estados
 * y nombres de campo (nunca textos completos), así que no hay nada sensible
 * que ocultar; se omiten los identificadores crudos.
 */
export function describeAuditMetadata(item: AdminAuditLogItem): string {
  const meta = item.metadata ?? {}
  const parts: string[] = []
  const code = (meta.roleCode ?? meta.code) as string | undefined
  if (code) parts.push(code)

  const fields = asList(meta.fields)
  if (fields.length) parts.push(`Cambió: ${fields.map((field) => FIELD_LABEL[field] ?? field).join(', ')}`)

  const added = asList(meta.added)
  const removed = asList(meta.removed)
  if (added.length) parts.push(`+ ${added.join(', ')}`)
  if (removed.length) parts.push(`− ${removed.join(', ')}`)

  if (typeof meta.previousRoleCode === 'string' && typeof meta.nextRoleCode === 'string') {
    parts.push(`${meta.previousRoleCode} → ${meta.nextRoleCode}`)
  }
  const prev = (meta.previousStatus ?? meta.fromStatus) as string | undefined
  const next = (meta.nextStatus ?? meta.toStatus) as string | undefined
  if (prev && next) parts.push(`${STATUS_LABEL[prev] ?? prev} → ${STATUS_LABEL[next] ?? next}`)

  return parts.join(' · ') || '—'
}
