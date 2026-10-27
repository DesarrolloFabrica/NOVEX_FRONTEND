import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { IntegritySnapshotSource } from '@/modules/operational-cards/types/operational-kpi.types'
import {
  buildIntegrityExplanation,
  formatIntegrityWhy,
  type IntegrityExplainInput,
} from '@/modules/operational-cards/domain/integrity-policy'
import { DirectorStatusBadge } from '@/modules/operational-cards/experience/director/DirectorStatusBadge'
import '@/styles/director-kpi-panel.css'

/**
 * Badge de integridad operativa.
 * Hoy siempre es snapshot live (`integritySource='live'`).
 * Futuro: `period-close` cuando exista integritySnapshotAt(date).
 */
export function DirectorEstadoOperativo({
  integrityStatus,
  explainInput,
  integritySource = 'live',
  testId = 'director-estado-operativo',
}: {
  integrityStatus: OperationalIntegrityStatus
  /** Conservado por compatibilidad; la síntesis de activos vive en cabecera. */
  activeCount?: number
  criticalSeverityCount?: number
  explainInput: IntegrityExplainInput
  /**
   * 'live' = evaluateCoordinationIntegrity actual.
   * 'period-close' reservado para snapshots históricos.
   */
  integritySource?: IntegritySnapshotSource
  testId?: string
}) {
  const explanation = buildIntegrityExplanation(integrityStatus, explainInput)
  const why = formatIntegrityWhy(explanation)
  const title =
    integritySource === 'period-close'
      ? 'Estado al cierre del periodo'
      : 'Estado actual'

  return (
    <section
      className="director-estado-op"
      data-testid={testId}
      data-integrity-source={integritySource}
    >
      <p className="director-estado__section-title">
        <span className="director-estado__section-mark" aria-hidden="true">
          ✦
        </span>
        <span>{title}</span>
        <span className="director-estado__section-rule" aria-hidden="true" />
      </p>

      <div className="director-estado-op__status">
        <DirectorStatusBadge
          status={integrityStatus}
          testId="director-estado-operativo-status"
          title={why}
        />
      </div>
    </section>
  )
}
