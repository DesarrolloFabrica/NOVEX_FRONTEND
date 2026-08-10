import { Link } from 'react-router-dom'
import type { EocCoordinationStatus } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import {
  getHealthLabel,
  severityClass,
} from '@/modules/executive-operations-center/utils/severityDisplay'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface CoordinationsStatusSectionProps {
  coordinations: EocCoordinationStatus[]
}

export function CoordinationsStatusSection({
  coordinations,
}: CoordinationsStatusSectionProps) {
  return (
    <ExecutiveHomeSection
      id="eoc-coordinations"
      eyebrow="Cobertura institucional"
      title="Salud por coordinación"
      integrationNote="GET /coordinations/status-board — salud por coordinación, situaciones activas, críticas, cobertura de seguimiento y última actividad."
      action={
        <Link to="/red-impacto" className="eoc-link-action" viewTransition>
          Ver mapa completo
          <NovexIcon name="arrow-up-right" size={14} />
        </Link>
      }
    >
      <div className="eoc-coord__board">
        {coordinations.map((coord) => (
          <article
            key={coord.id}
            className={`eoc-coord__row ${severityClass(coord.health)}`}
          >
            <div className="eoc-coord__identity">
              <span className="eoc-coord__beacon" aria-hidden="true" />
              <h3 className="eoc-coord__name">{coord.name}</h3>
            </div>
            <span className="eoc-coord__health">
              {getHealthLabel(coord.health)}
            </span>
            <dl className="eoc-coord__stats">
              <div>
                <dt>Activas</dt>
                <dd>{coord.activeSituations}</dd>
              </div>
              <div>
                <dt>Críticas</dt>
                <dd>{coord.criticalCount}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </ExecutiveHomeSection>
  )
}
