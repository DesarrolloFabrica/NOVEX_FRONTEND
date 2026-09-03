import type { OperationalOverviewTotals } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Frase institucional compacta, construida de forma determinística a partir de
 * los totales que ya llegaron. Sin IA, sin narrativa, sin recomendaciones y
 * sin KPIs: una línea que dice cuántas áreas piden atención.
 */
export function buildDirectionSummary(totals: OperationalOverviewTotals): string {
  const { critical, alert } = totals

  if (critical === 0 && alert === 0) return 'Operación estable'

  if (critical === 0) {
    return alert === 1
      ? '1 coordinación requiere atención'
      : `${alert} coordinaciones requieren atención`
  }

  const criticalPart =
    critical === 1 ? '1 coordinación crítica' : `${critical} coordinaciones críticas`

  if (alert === 0) return criticalPart

  return `${criticalPart} · ${alert} en alerta`
}
