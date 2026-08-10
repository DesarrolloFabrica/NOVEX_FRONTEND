import type { EocPlatformHealth, EocSeverity } from '@/modules/executive-operations-center/types/executive-home.types'

const SEVERITY_LABELS: Record<EocSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
  stable: 'Estable',
}

const HEALTH_LABELS: Record<EocPlatformHealth, string> = {
  operational: 'Operativo',
  degraded: 'Degradado',
  critical: 'Crítico',
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  created: 'Nueva situación',
  escalated: 'Escalada',
  resolved: 'Resuelta',
  ai_analysis: 'Análisis IA',
  status_change: 'Cambio de estado',
}

export function getSeverityLabel(severity: EocSeverity): string {
  return SEVERITY_LABELS[severity]
}

export function getHealthLabel(health: EocPlatformHealth): string {
  return HEALTH_LABELS[health]
}

export function getActivityTypeLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type
}

export function severityClass(severity: EocSeverity | EocPlatformHealth): string {
  return `eoc-severity--${severity}`
}
