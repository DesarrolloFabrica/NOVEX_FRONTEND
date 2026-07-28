import type { SituationListItem } from '@/modules/api/types/situation-management.types'

export const SITUATION_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
}

export const SITUATION_SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const RECOMMENDATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  DISMISSED: 'Descartada',
}

export const RECOMMENDATION_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const TIMELINE_EVENT_LABEL: Record<string, string> = {
  SITUATION_CREATED: 'Situación registrada',
  STATUS_CHANGED: 'Cambio de estado',
  SEVERITY_CHANGED: 'Cambio de severidad',
  UPDATED: 'Actualización',
  COMMENT_ADDED: 'Comentario',
  ATTACHMENT_ADDED: 'Evidencia agregada',
  AI_ANALYZED: 'Análisis IA generado',
  AI_ANALYSIS_STARTED: 'Análisis IA iniciado',
  AI_ANALYSIS_FAILED: 'Análisis IA fallido',
  AI_ANALYSIS_VERSION_CREATED: 'Nueva versión de análisis',
  AI_REANALYZED: 'Reanálisis IA',
  RECOMMENDATION_GENERATED: 'Recomendación generada',
  RECOMMENDATION_UPDATED: 'Recomendación actualizada',
  RECOMMENDATION_COMPLETED: 'Recomendación completada',
  CLOSED: 'Situación cerrada',
  REOPENED: 'Situación reabierta',
}

export function situationRef(id: string): string {
  return `SIT-${id.slice(0, 8).toUpperCase()}`
}

export function formatManagementDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatManagementDateShort(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

/** Fecha compacta para tablas densas (ej. 28/07/26). */
export function formatRegistryTableDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export function sortSituationsForQueue(
  situations: SituationListItem[],
): SituationListItem[] {
  const severityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }

  return [...situations].sort((left, right) => {
    const severityDiff =
      (severityWeight[right.severity] ?? 0) -
      (severityWeight[left.severity] ?? 0)
    if (severityDiff !== 0) return severityDiff

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
  })
}
