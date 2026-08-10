import type { SituationListItem } from '@/modules/api/types/situation-management.types'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import {
  OPERATIONAL_STATUS_LABEL,
  type SituationOperationalStatus,
} from '@/modules/monitoring/utils/situation-lifecycle'

export const SITUATION_STATUS_LABEL: Record<string, string> = {
  OPEN: OPERATIONAL_STATUS_LABEL.OPEN,
  IN_PROGRESS: OPERATIONAL_STATUS_LABEL.IN_PROGRESS,
  RESOLVED: OPERATIONAL_STATUS_LABEL.RESOLVED,
  CLOSED: OPERATIONAL_STATUS_LABEL.CLOSED,
}

export const SITUATION_SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

/** @deprecated La UI ya no administra estados de recomendación. */
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
  CRITICAL: 'Inmediata',
}

export const RECOMMENDATION_PRIORITY_ORDER = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
] as const

export type RecommendationPriorityGroup =
  (typeof RECOMMENDATION_PRIORITY_ORDER)[number]

export function groupRecommendationsByPriority(
  recommendations: SituationRecommendation[],
): Array<{
  priority: RecommendationPriorityGroup
  label: string
  items: SituationRecommendation[]
}> {
  return RECOMMENDATION_PRIORITY_ORDER.map((priority) => ({
    priority,
    label: RECOMMENDATION_PRIORITY_LABEL[priority] ?? priority,
    items: recommendations.filter((item) => item.priority === priority),
  })).filter((group) => group.items.length > 0)
}

export const TIMELINE_EVENT_LABEL: Record<string, string> = {
  SITUATION_CREATED: 'Situación registrada',
  STATUS_CHANGED: 'Estado actualizado',
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

export function formatManagementTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
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

/** Fecha y hora compactas para auditoría en tablas (ej. 06/08/26 · 10:23 a. m.). */
export function formatRegistryTableDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
  const time = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day} · ${time}`
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

  const statusWeight: Record<SituationOperationalStatus, number> = {
    IN_PROGRESS: 4,
    OPEN: 3,
    RESOLVED: 2,
    CLOSED: 1,
  }

  return [...situations].sort((left, right) => {
    const statusDiff =
      (statusWeight[right.status as SituationOperationalStatus] ?? 0) -
      (statusWeight[left.status as SituationOperationalStatus] ?? 0)
    if (statusDiff !== 0) return statusDiff

    const severityDiff =
      (severityWeight[right.severity] ?? 0) -
      (severityWeight[left.severity] ?? 0)
    if (severityDiff !== 0) return severityDiff

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )
  })
}
