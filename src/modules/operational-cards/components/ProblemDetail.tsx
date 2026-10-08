import type { ReactNode } from 'react'
import { ProblemDetailSection } from '@/modules/operational-cards/components/ProblemDetailSection'
import {
  splitProblemEvidences,
  toProblemTimelineEntryView,
  type FormattedDateTime,
} from '@/modules/operational-cards/data/problemDetailPresentation'
import { formatDossierFolio } from '@/modules/operational-cards/data/problemDossier'
import { resolveSituationViewpointLabel } from '@/modules/operational-cards/data/situationViewpoint'
import { ProblemConsequences } from '@/modules/operational-cards/components/ProblemConsequences'
import { ProblemSeverityTrail } from '@/modules/operational-cards/components/ProblemSeverityTrail'
import type { ConsequenceDraft } from '@/modules/operational-cards/services/problem-consequence.service'
import type {
  OperationalCardsLevel2State,
  OperationalSubmissionState,
} from '@/modules/operational-cards/types/operational-cards.state'
import type {
  LazyProblemSectionId,
  ProblemDetail as ProblemDetailData,
  ProblemSectionId,
  ProblemSectionState,
} from '@/modules/operational-cards/types/problem-detail.types'
import '@/styles/operational-problem-detail.css'

/**
 * Detalle de un problema (LEVEL 2), en la región permanente del shell.
 *
 * No hay velo, ni `role="dialog"`, ni botón de cerrar: no se cierra nada, se
 * mira otro problema. «Volver» lo pone el panel que lo contiene.
 *
 * Sin IA: el detalle no muestra ni pide análisis, resúmenes generados ni
 * recomendaciones.
 *
 * Orden de lectura:
 *   1. Encabezado        tipo, folio, título, severidad, estado y SLA; si la
 *                        severidad cambió, «Reportado como · Actual».
 *   2. Contexto          coordinaciones, proceso afectado y entrega pendiente.
 *   3. Descripción       el texto del reporte, íntegro (no se deduplica).
 *   4. Afectaciones      solo INTERNAL: consecuencias acumuladas (append-only).
 *   5. Notas del reporte y Otras evidencias, solo si existen.
 *   6. Cronología        perezosa, sin eventos del circuito de IA.
 * Seguimiento, resolución y aprendizaje viven en `ProblemActions`, debajo.
 *
 * Los acordeones no llevan contador: el número aparecía o desaparecía según el
 * estado de carga y no ayudaba a leer.
 *
 * Las únicas acciones son desplegar secciones y reintentar una carga fallida;
 * las mutaciones son de `ProblemActions`.
 */

const SEVERITY_LABEL = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
} as const

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'En atención',
  CLOSED: 'Cerrado',
}

const SLA_LABEL = {
  on_track: 'SLA en plazo',
  at_risk: 'SLA en riesgo',
  overdue: 'SLA vencido',
  closed: 'SLA cerrado',
} as const

const HEADING_ID = 'problem-detail-title'

/** Rótulo cuando el backend no trae coordinación: neutro, nunca otra coordinación. */
const NO_COORDINATION = 'Sin coordinación'

/** Aviso de fallo con su reintento. Un error nunca se lee como «sin datos». */
function RetryNotice({
  message,
  testId,
  onRetry,
}: {
  message: string
  testId: string
  onRetry: () => void
}) {
  return (
    <div className="detail-retry" data-testid={testId} role="alert">
      <p className="detail-section__note detail-section__note--error">
        {message}
      </p>
      <button
        type="button"
        className="detail-retry__button"
        data-testid={`${testId}-retry`}
        onClick={onRetry}
      >
        Reintentar
      </button>
    </div>
  )
}

/** Estado uniforme de una sección perezosa: carga, error (con reintento) o vacío. */
function SectionState<T>({
  section,
  emptyLabel,
  errorMessage,
  onRetry,
  children,
}: {
  section: ProblemSectionState<T>
  emptyLabel: string
  errorMessage: string
  onRetry: () => void
  children: (items: readonly T[]) => ReactNode
}) {
  if (section.status === 'loading' || section.status === 'idle') {
    return (
      <p
        className="detail-section__note"
        data-testid="detail-section-loading"
        role="status"
      >
        Cargando…
      </p>
    )
  }

  // El fallo se queda dentro de la sección: el detalle sigue utilizable.
  if (section.status === 'error') {
    return (
      <RetryNotice
        message={errorMessage}
        testId="detail-section-error"
        onRetry={onRetry}
      />
    )
  }

  if (section.items.length === 0) {
    return (
      <p className="detail-section__note" data-testid="detail-section-empty">
        {emptyLabel}
      </p>
    )
  }

  return <>{children(section.items)}</>
}

/** Autor y fecha de un registro, con `<time>` solo si la fecha es válida. */
function Byline({ author, date }: { author: string; date: FormattedDateTime }) {
  return (
    <p className="detail-entry__byline">
      <span className="detail-entry__author">{author}</span>
      <span aria-hidden="true"> · </span>
      {date.iso ? (
        <time dateTime={date.iso}>{date.label}</time>
      ) : (
        <span>{date.label}</span>
      )}
    </p>
  )
}

/**
 * Filas del bloque de contexto. Se arman como lista para que el `<dl>` solo
 * contenga lo que existe: en un problema interno no hay «afectada» distinta,
 * y proceso/entrega solo existen en las dependencias que los registraron.
 */
function contextRows(
  detail: ProblemDetailData,
): { key: string; label: string; value: string }[] {
  const responsible = detail.coordinationName ?? NO_COORDINATION

  if (detail.reportKind !== 'INTER_COORDINATION') {
    return [{ key: 'responsible', label: 'Coordinación', value: responsible }]
  }

  const rows = [
    { key: 'responsible', label: 'Responsable', value: responsible },
    {
      key: 'affected',
      label: 'Afectada',
      value: detail.affectedCoordinationName ?? NO_COORDINATION,
    },
  ]
  if (detail.affectedProcess) {
    rows.push({
      key: 'process',
      label: 'Proceso afectado',
      value: detail.affectedProcess,
    })
  }
  if (detail.pendingDelivery) {
    rows.push({
      key: 'delivery',
      label: 'Entrega pendiente',
      value: detail.pendingDelivery,
    })
  }
  return rows
}

export interface ProblemDetailProps {
  level2: OperationalCardsLevel2State
  selectedCoordinationCode?: string | null
  onToggleSection: (section: ProblemSectionId) => void
  /** Reintenta la carga fallida de notas o cronología. */
  onRetrySection?: (section: LazyProblemSectionId) => void
  /**
   * Escritura de afectaciones. Ausente = solo lectura (shells sin escritura).
   * Aun presente, el CTA solo aparece si el backend dice `canAddConsequence`.
   */
  consequenceActions?: {
    submission: OperationalSubmissionState
    onSubmit: (draft: ConsequenceDraft) => Promise<boolean>
  } | null
}

const IDLE_SUBMISSION: OperationalSubmissionState = {
  kind: null,
  status: 'idle',
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

export function ProblemDetail({
  level2,
  selectedCoordinationCode = null,
  onToggleSection,
  onRetrySection = () => undefined,
  consequenceActions = null,
}: ProblemDetailProps) {
  const { detail, sections, expanded, status } = level2
  const isExpanded = (section: ProblemSectionId) => expanded.includes(section)
  const kindLabel = detail
    ? resolveSituationViewpointLabel({
        reportKind: detail.reportKind,
        selectedCoordinationCode,
        responsibleCode: detail.coordinationCode,
        affectedCode: detail.affectedCoordinationCode,
      })
    : null

  // Notas y otras evidencias salen de la misma carga; separarlas aquí decide
  // qué acordeones existen sin pedir nada más.
  const evidences = sections.evidences
  const { notes, others } =
    evidences.status === 'ready'
      ? splitProblemEvidences(evidences.items)
      : { notes: [], others: [] }

  return (
    <section
      className="problem-detail"
      data-testid="problem-detail"
      data-level2={status}
      data-problem={level2.problemId ?? ''}
      data-report-kind={detail?.reportKind ?? undefined}
      aria-labelledby={HEADING_ID}
    >
      <header className="problem-detail__header">
        <div className="problem-detail__heading">
          {detail && (
            <p className="problem-detail__eyebrow">
              {kindLabel && (
                <span
                  className="problem-detail__kind"
                  data-testid="detail-report-kind"
                >
                  {kindLabel}
                </span>
              )}
              <span
                className="problem-detail__folio"
                data-testid="detail-folio"
              >
                {formatDossierFolio(detail.id)}
              </span>
            </p>
          )}
          <h3 id={HEADING_ID} className="problem-detail__title">
            {detail?.title ?? 'Detalle del problema'}
          </h3>

          {detail && (
            <p className="problem-detail__badges">
              <span
                className="problem-detail__badge problem-detail__badge--severity"
                data-severity={detail.severity}
                data-testid="detail-severity"
              >
                {SEVERITY_LABEL[detail.severity]}
              </span>
              <span
                className="problem-detail__badge problem-detail__badge--status"
                data-status={detail.status}
                data-testid="detail-status"
              >
                {STATUS_LABEL[detail.status] ?? detail.status}
              </span>
              {detail.slaHealth && (
                <span
                  className="problem-detail__badge"
                  data-sla={detail.slaHealth}
                  data-testid="detail-sla"
                >
                  {SLA_LABEL[detail.slaHealth]}
                </span>
              )}
            </p>
          )}

          {detail && (
            <ProblemSeverityTrail
              reportedSeverity={detail.reportedSeverity}
              severity={detail.severity}
              history={detail.severityHistory}
            />
          )}
        </div>
      </header>

      {detail && (
        <dl
          className="problem-detail__context"
          data-testid="detail-context"
          aria-label="Contexto del problema"
        >
          {contextRows(detail).map((row) => (
            <div
              key={row.key}
              className="problem-detail__context-row"
              data-context={row.key}
            >
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(status === 'loading' || status === 'idle') && (
        <div
          className="problem-detail__skeleton"
          data-testid="detail-loading"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>
      )}

      {status === 'error' && (
        <p
          className="problem-detail__notice"
          data-testid="detail-error"
          role="alert"
        >
          No pudimos cargar el detalle del problema.
        </p>
      )}

      {status === 'ready' && detail && (
        <>
          <section
            className="problem-detail__description"
            data-testid="detail-description"
            aria-labelledby="problem-detail-description-title"
          >
            <h4
              id="problem-detail-description-title"
              className="problem-detail__block-title"
            >
              Descripción del problema
            </h4>
            <p className="problem-detail__description-text">
              {detail.description}
            </p>
          </section>

          {detail.reportKind === 'INTERNAL' && (
            <ProblemConsequences
              consequences={detail.consequences}
              canAdd={Boolean(consequenceActions) && detail.canAddConsequence}
              closed={detail.status === 'CLOSED'}
              submission={consequenceActions?.submission ?? IDLE_SUBMISSION}
              onSubmit={
                consequenceActions?.onSubmit ?? (() => Promise.resolve(false))
              }
            />
          )}

          {/*
           * Mientras no se sabe si hay notas se dice en una línea, sin pintar un
           * acordeón que podría quedar vacío; sin notas, no aparece nada.
           */}
          {(evidences.status === 'idle' || evidences.status === 'loading') && (
            <p
              className="detail-section__note problem-detail__notes-status"
              data-testid="detail-notes-loading"
              role="status"
            >
              Cargando notas del reporte…
            </p>
          )}

          {evidences.status === 'error' && (
            <RetryNotice
              message="No pudimos cargar las notas del reporte."
              testId="detail-notes-error"
              onRetry={() => onRetrySection('evidences')}
            />
          )}

          <div className="problem-detail__sections">
            {notes.length > 0 && (
              <ProblemDetailSection
                id="notes"
                title="Notas del reporte"
                expanded={isExpanded('notes')}
                onToggle={onToggleSection}
              >
                <ul className="detail-entries" data-testid="detail-notes">
                  {notes.map((note) => (
                    <li key={note.id} className="detail-entry">
                      <p className="detail-entry__title">{note.title}</p>
                      <p className="detail-entry__content">{note.content}</p>
                      <Byline author={note.author} date={note.date} />
                    </li>
                  ))}
                </ul>
              </ProblemDetailSection>
            )}

            {others.length > 0 && (
              <ProblemDetailSection
                id="other-evidences"
                title="Otras evidencias"
                expanded={isExpanded('other-evidences')}
                onToggle={onToggleSection}
              >
                <ul
                  className="detail-entries"
                  data-testid="detail-other-evidences"
                >
                  {others.map((item) => (
                    <li key={item.id} className="detail-entry">
                      <p className="detail-entry__title">
                        {item.title}
                        <span className="detail-entry__kind">
                          {item.typeLabel}
                        </span>
                      </p>
                      {item.description && (
                        <p className="detail-entry__content">
                          {item.description}
                        </p>
                      )}
                      {item.facts.length > 0 && (
                        <dl className="detail-entry__facts">
                          {item.facts.map((fact) => (
                            <div key={fact.label}>
                              <dt>{fact.label}</dt>
                              <dd>{fact.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <Byline author={item.author} date={item.date} />
                    </li>
                  ))}
                </ul>
              </ProblemDetailSection>
            )}

            <ProblemDetailSection
              id="timeline"
              title="Cronología"
              expanded={isExpanded('timeline')}
              onToggle={onToggleSection}
            >
              <SectionState
                section={sections.timeline}
                emptyLabel="Sin actividad registrada."
                errorMessage="No pudimos cargar la cronología."
                onRetry={() => onRetrySection('timeline')}
              >
                {(items) => (
                  <ol className="detail-entries" data-testid="detail-timeline">
                    {items.map((item) => {
                      const view = toProblemTimelineEntryView(item)
                      return (
                        <li key={view.id} className="detail-entry">
                          <p className="detail-entry__title">{view.label}</p>
                          {view.transition && (
                            <p
                              className="detail-entry__transition"
                              data-testid="detail-timeline-transition"
                            >
                              {`${view.transition.from} → ${view.transition.to}`}
                            </p>
                          )}
                          {view.details.map((line) => (
                            <p key={line} className="detail-entry__content">
                              {line}
                            </p>
                          ))}
                          <Byline author={view.actor} date={view.date} />
                        </li>
                      )
                    })}
                  </ol>
                )}
              </SectionState>
            </ProblemDetailSection>
          </div>
        </>
      )}
    </section>
  )
}
