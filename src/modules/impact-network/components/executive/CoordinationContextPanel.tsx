import { memo } from 'react'
import { motion } from 'motion/react'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import {
  getCoordinationContextPanel,
  type CoordinationContextPanelData,
} from '@/modules/impact-network/data/executive-operational-overview.mock'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface CoordinationContextPanelProps {
  coordinationId: CoordinationId | null
  reducedMotion?: boolean
  onClose: () => void
  /**
   * Fase 2: el detalle de situación debe responder qué pasa, a quién afecta,
   * qué tan importante es, qué se está haciendo y qué vigilar — en lenguaje
   * ejecutivo. Conservar animación de panel; no reemplazar por scores/IDs.
   */
  onViewSituation?: () => void
}

function PanelBody({
  data,
  onClose,
  onViewSituation,
}: {
  data: CoordinationContextPanelData
  onClose: () => void
  onViewSituation?: () => void
}) {
  return (
    <div className="impact-executive-context__inner">
      <header className="impact-executive-context__header">
        <div>
          <p className="impact-executive-context__eyebrow">Coordinación</p>
          <h3>{data.name}</h3>
        </div>
        <button
          type="button"
          className="impact-executive-context__close"
          aria-label="Cerrar panel"
          onClick={onClose}
        >
          <NovexIcon name="x" size={16} />
        </button>
      </header>

      <div className="impact-executive-context__status" data-status={data.status}>
        <span>Estado</span>
        <strong>{data.statusLabel}</strong>
      </div>

      <section className="impact-executive-context__section">
        <h4>Qué está ocurriendo</h4>
        <ul className="impact-executive-context__problems">
          {data.whatIsHappening.map((item) => (
            <li key={item.categoryId}>
              <span className="impact-executive-context__problem-icon">
                <ProblemCategoryGlyph categoryId={item.categoryId} size={15} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="impact-executive-context__section">
        <h4>Situación principal</h4>
        <article className="impact-executive-context__situation">
          <strong>{data.mainSituation.title}</strong>
          <p>{data.mainSituation.description}</p>
          {data.mainSituation.alsoAffects ? (
            <small>{data.mainSituation.alsoAffects}</small>
          ) : null}
          <button
            type="button"
            className="impact-executive-context__cta"
            onClick={onViewSituation}
          >
            Ver situación
          </button>
        </article>
      </section>

      <section className="impact-executive-context__section">
        <h4>Actividad reciente</h4>
        <ol className="impact-executive-context__activity">
          {data.recentActivity.map((item) => (
            <li key={item.id} data-tone={item.tone}>
              <time>{item.timeLabel}</time>
              <span>{item.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function CoordinationContextPanelView({
  coordinationId,
  reducedMotion = false,
  onClose,
  onViewSituation,
}: CoordinationContextPanelProps) {
  const data = coordinationId
    ? getCoordinationContextPanel(coordinationId)
    : null

  if (!data) return null

  return (
    <motion.section
      className="impact-executive-context"
      aria-label={`Detalle de ${data.name}`}
      data-coordination-id={data.coordinationId}
      initial={reducedMotion ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: 24 }}
      transition={{
        duration: reducedMotion ? 0 : 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <PanelBody
        data={data}
        onClose={onClose}
        onViewSituation={onViewSituation}
      />
    </motion.section>
  )
}

export const CoordinationContextPanel = memo(CoordinationContextPanelView)
