import { memo, useMemo } from 'react'
import { motion } from 'motion/react'
import type { ExecutiveCoordinationView } from '@/modules/impact-network/data/executive-operational-overview.model'
import { ProblemCategoryGlyph } from '@/modules/impact-network/components/executive/ProblemCategoryGlyph'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface CoordinationContextPanelProps {
  coordination: ExecutiveCoordinationView
  reducedMotion?: boolean
  onClose: () => void
  onOpenCoordination?: (coordinationId: string) => void
  onOpenSituation?: (situationId: string) => void
}

const STATUS_GUIDANCE = {
  critical: 'Requiere acción inmediata',
  high: 'Debe revisarse hoy',
  attention: 'Requiere seguimiento',
  normal: 'Operación estable',
} as const

function formatActivityTime(value: string): string {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Reciente'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (minutes < 2) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  if (minutes < 1_440) return `Hace ${Math.round(minutes / 60)} h`
  return `Hace ${Math.round(minutes / 1_440)} d`
}

function CoordinationContextPanelView({
  coordination,
  reducedMotion = false,
  onClose,
  onOpenCoordination,
  onOpenSituation,
}: CoordinationContextPanelProps) {
  const categorySummary = useMemo(() => {
    const groups = new Map<
      string,
      {
        categoryId: (typeof coordination.categories)[number]
        label: string
        count: number
      }
    >()
    for (const situation of coordination.situations) {
      const current = groups.get(situation.categoryId)
      groups.set(situation.categoryId, {
        categoryId: situation.categoryId,
        label: situation.categoryName,
        count: (current?.count ?? 0) + 1,
      })
    }
    return [...groups.values()].sort((left, right) => right.count - left.count)
  }, [coordination.situations])

  const primarySituation = coordination.situations[0] ?? null
  const relatedCoordinationCount = Math.max(
    0,
    ...coordination.situations.map(
      (situation) => situation.affectedCoordinationCount - 1,
    ),
  )
  const recentActivityCount = coordination.situations.filter((situation) => {
    const updatedAt = new Date(situation.updatedAt).getTime()
    return (
      Number.isFinite(updatedAt) && Date.now() - updatedAt <= 7 * 24 * 60 * 60 * 1_000
    )
  }).length

  return (
    <motion.section
      className="impact-executive-context"
      aria-label={`Resumen de ${coordination.name}`}
      data-impact-tour="coordination-summary"
      data-coordination-id={coordination.id}
      data-status={coordination.status}
      initial={reducedMotion ? false : { opacity: 0, x: 26 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: 22 }}
      transition={{
        duration: reducedMotion ? 0 : 0.26,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="impact-executive-context__inner">
        <div className="impact-executive-context__toolbar">
          <header className="impact-executive-context__header">
            <div>
              <p className="impact-executive-context__eyebrow">Coordinación</p>
              <h3>{coordination.name}</h3>
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

          <div
            className="impact-executive-context__status"
            data-status={coordination.status}
          >
            <div>
              <span>Estado actual</span>
              <small>{STATUS_GUIDANCE[coordination.status]}</small>
            </div>
            <strong>
              <i aria-hidden="true" /> {coordination.statusLabel}
            </strong>
          </div>

          <ul
            className="impact-executive-context__signals"
            aria-label="Señales que explican el estado"
          >
            <li>{coordination.activeSituationCount} situaciones activas</li>
            <li>
              {relatedCoordinationCount > 0
                ? `${relatedCoordinationCount} coordinación${relatedCoordinationCount === 1 ? '' : 'es'} relacionada${relatedCoordinationCount === 1 ? '' : 's'}`
                : 'Impacto contenido'}
            </li>
            <li>
              {coordination.activeSituationCount >= 3
                ? 'Recurrencia detectada'
                : coordination.status === 'normal'
                  ? 'Sin incidencias vigentes'
                  : 'Incidencia activa'}
            </li>
          </ul>
        </div>

        <div className="impact-executive-context__body">
          <section className="impact-executive-context__section">
            <h4>Qué está pasando</h4>
            <p className="impact-executive-context__summary">
              {primarySituation
                ? primarySituation.description
                : 'La coordinación opera sin situaciones activas y no requiere intervención inmediata.'}
            </p>
          </section>

          <section className="impact-executive-context__section">
            <h4>Impacto actual</h4>
            <dl className="impact-executive-context__impact-metrics">
              <div>
                <dd>{coordination.activeSituationCount}</dd>
                <dt>Abiertas</dt>
              </div>
              <div>
                <dd>{relatedCoordinationCount}</dd>
                <dt>Relacionadas</dt>
              </div>
              <div>
                <dd>{recentActivityCount}</dd>
                <dt>Recientes</dt>
              </div>
            </dl>
          </section>

          {primarySituation ? (
            <section className="impact-executive-context__section">
              <h4>Principal situación</h4>
              <article className="impact-executive-context__situation">
                <strong>{primarySituation.title}</strong>
                <p>{primarySituation.description}</p>
                <small>
                  {primarySituation.affectedCoordinationCount > 1
                    ? `Impacta ${primarySituation.affectedCoordinationCount} coordinaciones`
                    : 'Impacto concentrado en esta coordinación'}
                </small>
                {onOpenSituation ? (
                  <button
                    type="button"
                    className="impact-executive-context__situation-action"
                    onClick={() => onOpenSituation(primarySituation.id)}
                  >
                    Abrir expediente
                    <NovexIcon name="chevron-right" size={13} />
                  </button>
                ) : null}
              </article>
            </section>
          ) : (
            <div className="impact-executive-context__stable">
              <span>
                <NovexIcon name="shield" size={22} />
              </span>
              <strong>Operación estable</strong>
              <p>No hay situaciones vigentes asociadas a esta coordinación.</p>
            </div>
          )}

          {categorySummary.length > 0 ? (
            <section className="impact-executive-context__section">
              <h4>Otros frentes</h4>
              <ul className="impact-executive-context__problems">
                {categorySummary.map((item) => (
                  <li key={item.categoryId}>
                    <span className="impact-executive-context__problem-icon">
                      <ProblemCategoryGlyph
                        categoryId={item.categoryId}
                        size={15}
                      />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>
                        {item.count} registro{item.count === 1 ? '' : 's'}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {coordination.situations.length > 0 ? (
            <section className="impact-executive-context__section">
              <h4>Actividad reciente</h4>
              <ol className="impact-executive-context__activity">
                {coordination.situations.slice(0, 3).map((situation) => (
                  <li key={situation.id} data-tone={situation.operationalStatus}>
                    <time>{formatActivityTime(situation.updatedAt)}</time>
                    <span>{situation.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <div className="impact-executive-context__actions">
          {onOpenCoordination ? (
            <button
              type="button"
              className="impact-executive-context__cta impact-executive-context__cta--primary"
              onClick={() => onOpenCoordination(coordination.id)}
            >
              Explorar {coordination.shortName}
              <NovexIcon name="arrow-up-right" size={14} />
            </button>
          ) : onOpenSituation && primarySituation ? (
            <button
              type="button"
              className="impact-executive-context__cta impact-executive-context__cta--primary"
              onClick={() => onOpenSituation(primarySituation.id)}
            >
              Revisar situación
              <NovexIcon name="arrow-up-right" size={14} />
            </button>
          ) : null}
          {onOpenCoordination && onOpenSituation && primarySituation ? (
            <button
              type="button"
              className="impact-executive-context__cta impact-executive-context__cta--map"
              onClick={() => onOpenSituation(primarySituation.id)}
            >
              Revisar situación
            </button>
          ) : null}
        </div>
      </div>
    </motion.section>
  )
}

export const CoordinationContextPanel = memo(CoordinationContextPanelView)
