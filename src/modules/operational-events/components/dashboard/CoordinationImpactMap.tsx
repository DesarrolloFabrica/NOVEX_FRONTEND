import type { CoordinationImpactEntry } from '@/modules/api/types/dashboard.types'
import { DashboardNoDataState } from '@/modules/operational-events/components/dashboard/DashboardStateViews'

interface CoordinationImpactMapProps {
  entries: CoordinationImpactEntry[]
}

const IMPACT_LABEL: Record<CoordinationImpactEntry['impactLevel'], string> = {
  LOW: 'Bajo',
  MEDIUM: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
}

export function CoordinationImpactMap({ entries }: CoordinationImpactMapProps) {
  return (
    <section
      className="cunmark-intel-change cunmark-coord-impact"
      aria-labelledby="coord-impact-heading"
    >
      <h3 id="coord-impact-heading" className="cunmark-section-eyebrow mb-0">
        Mapa de impacto
      </h3>
      <p className="cunmark-section-hint mb-2">
        Intensidad por coordinación según afectaciones reales.
      </p>

      {entries.length === 0 ? (
        <DashboardNoDataState label="Sin coordinaciones afectadas registradas." />
      ) : (
        <ul className="cunmark-coord-impact__list">
          {entries.slice(0, 8).map((entry) => (
            <li key={entry.coordinationId} className="cunmark-coord-impact__item">
              <div className="cunmark-coord-impact__header">
                <strong>{entry.coordinationCode}</strong>
                <span data-level={entry.impactLevel}>
                  {IMPACT_LABEL[entry.impactLevel]}
                </span>
              </div>
              <p className="cunmark-coord-impact__name">{entry.coordinationName}</p>
              <div
                className="cunmark-coord-impact__meter"
                role="meter"
                aria-label={`Intensidad ${entry.intensity}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={entry.intensity}
              >
                <span style={{ width: `${entry.intensity}%` }} />
              </div>
              <p className="cunmark-coord-impact__meta">
                {entry.situationCount} situación
                {entry.situationCount === 1 ? '' : 'es'} · {entry.intensity}% intensidad
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
