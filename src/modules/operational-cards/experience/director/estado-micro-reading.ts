import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type {
  OperationalKpiSeverityCounts,
  OperationalKpiStatusCounts,
} from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * Microlectura determinista del snapshot. Sin IA ni juicios de desempeño.
 * Prioriza la señal que mejor explica integrityStatus.
 */
export function buildEstadoMicroReading(input: {
  integrityStatus: OperationalIntegrityStatus
  activeCount: number
  severity: OperationalKpiSeverityCounts
  status: OperationalKpiStatusCounts
}): string {
  const { integrityStatus, activeCount, severity, status } = input

  if (activeCount <= 0) {
    return 'No hay problemas activos en esta coordinación.'
  }

  if (severity.critical > 0) {
    const n = severity.critical
    return n === 1
      ? '1 problema crítico está activando el estado crítico.'
      : `${n} problemas críticos están activando el estado crítico.`
  }

  if (
    (integrityStatus === 'CRITICO' || integrityStatus === 'ALERTA') &&
    severity.high > 0 &&
    severity.high >= severity.medium &&
    severity.high >= severity.low
  ) {
    return `${severity.high} de los ${activeCount} problemas activos son de severidad alta.`
  }

  if (severity.high > 0 && severity.high * 2 >= activeCount) {
    return `${severity.high} de los ${activeCount} problemas activos son de severidad alta.`
  }

  return `La coordinación mantiene ${status.open} problemas abiertos y ${status.inProgress} en atención.`
}

export function buildDirectionMicroReading(input: {
  directionStatus: OperationalIntegrityStatus
  activeCount: number
  criticalCoordinations: number
  status: OperationalKpiStatusCounts
}): string {
  const { directionStatus, activeCount, criticalCoordinations, status } = input
  if (activeCount <= 0) {
    return 'No hay problemas activos en la Dirección.'
  }
  if (criticalCoordinations > 0 && directionStatus === 'CRITICO') {
    return criticalCoordinations === 1
      ? '1 coordinación en estado crítico concentra la alerta de Dirección.'
      : `${criticalCoordinations} coordinaciones en estado crítico concentran la alerta de Dirección.`
  }
  return `La Dirección mantiene ${status.open} problemas abiertos y ${status.inProgress} en atención.`
}
