import type { CSSProperties } from 'react'
import { CoordinationMark } from '@/modules/operational-cards/components/CoordinationMark'
import type { ProblemMark } from '@/modules/operational-cards/data/coordinationMark'
import {
  formatDossierFolio,
  resolveDossierCoordinationColor,
  resolveDossierSlaNotice,
  resolveDossierStubStyle,
  resolveDossierTypeBadge,
  type DossierSlaHealth,
} from '@/modules/operational-cards/data/problemDossier'
import type {
  SituationReportKind,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'

/**
 * Ficha breve de expediente / talón de ticket.
 *
 * Presentación compartida de «Mis reportes» y «Problemas de mi coordinación».
 * El botón completo sigue siendo el único control interactivo.
 *
 * Variante `compact` (solo la usa `ProblemRow`, es decir, los paneles de
 * problemas de la coordinación): el talón deja el folio y lleva el logo de la
 * coordinación representada; el cuerpo queda en coordinación + título + tipo,
 * con severidad y estado a la derecha y sin aviso SLA. «Mis reportes» e
 * historial no la piden y siguen con la ficha dossier.
 */

export type ProblemDossierVariant = 'dossier' | 'compact'

export interface ProblemDossierCardProps {
  id: string
  title: string
  severity: SituationSeverity
  status: string
  reportKind: SituationReportKind | null | undefined
  mark: ProblemMark
  severityLabel: string
  statusLabel: string
  accessibleName: string
  selected?: boolean
  closed?: boolean
  slaHealth?: DossierSlaHealth | null
  /** Color de overview por code (refina el canónico de islas). */
  colorByCode?: Readonly<Record<string, string>>
  /** Clase de superficie adicional (`problem-row` / `my-reports__row`). */
  surfaceClassName: string
  testId: string
  originTestId: string
  severityTestId?: string
  statusTestId?: string
  unassigned?: boolean
  variant?: ProblemDossierVariant
  onClick?: () => void
}

export function ProblemDossierCard({
  id,
  title,
  severity,
  status,
  reportKind,
  mark,
  severityLabel,
  statusLabel,
  accessibleName,
  selected = false,
  closed = false,
  slaHealth = null,
  colorByCode,
  surfaceClassName,
  testId,
  originTestId,
  severityTestId = 'problem-row-severity',
  statusTestId = 'problem-row-status',
  unassigned = false,
  variant = 'dossier',
  onClick,
}: ProblemDossierCardProps) {
  const compact = variant === 'compact'
  // La ficha compacta no muestra SLA: ni aviso ni atributo.
  const sla = compact ? null : resolveDossierSlaNotice(slaHealth)
  const typeBadge = resolveDossierTypeBadge(reportKind)
  const coordinationColor = resolveDossierCoordinationColor(
    mark.code,
    mark.code ? colorByCode?.[mark.code] : null,
  )
  const stub = resolveDossierStubStyle(coordinationColor)
  const stubStyle = {
    ['--dossier-stub-bg' as string]: stub.background ?? undefined,
    ['--dossier-stub-ink' as string]: stub.ink,
  } as CSSProperties

  const severityChip = (
    <span
      className="problem-dossier__severity"
      data-testid={severityTestId}
      data-severity={severity}
    >
      {severityLabel}
    </span>
  )
  const statusChip = (
    <span
      className="problem-dossier__status"
      data-testid={statusTestId}
      data-status={status}
    >
      {statusLabel}
    </span>
  )

  return (
    <button
      type="button"
      className={[
        'problem-dossier',
        compact ? 'problem-dossier--compact' : '',
        surfaceClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
      data-problem-id={id}
      data-severity={severity}
      data-status={status}
      data-report-kind={reportKind ?? 'INTERNAL'}
      data-dossier-type={typeBadge.key}
      data-mark-relation={mark.relation}
      data-mark-code={mark.code ?? undefined}
      data-stub-colored={stub.background ? 'true' : undefined}
      data-selected={selected ? 'true' : 'false'}
      data-closed={closed ? 'true' : undefined}
      data-sla={sla?.tone}
      data-unassigned={unassigned ? 'true' : undefined}
      aria-current={selected ? 'true' : undefined}
      aria-label={accessibleName}
      style={stubStyle}
      onClick={onClick}
    >
      {compact ? (
        <>
          {/* Talón: solo color e identidad de la coordinación representada. */}
          <span
            className="problem-dossier__stub"
            data-testid="problem-dossier-stub"
            aria-hidden="true"
          >
            <CoordinationMark
              className="problem-dossier__stub-mark problem-row__mark"
              asset={mark.asset}
              code={mark.code}
            />
          </span>

          <span className="problem-dossier__body">
            <span className="problem-dossier__context">
              <span
                className="problem-dossier__kind"
                data-testid="problem-dossier-type"
                data-dossier-type={typeBadge.key}
              >
                {typeBadge.label}
              </span>
              {/* La relación completa («Nos afecta desde…») queda en el
                  tooltip y en el nombre accesible. */}
              <span
                className="problem-dossier__origin"
                data-testid={originTestId}
                title={mark.originLine}
              >
                {mark.coordinationLabel}
              </span>
            </span>
            <span className="problem-dossier__title" title={title}>
              {title}
            </span>
            <span className="problem-dossier__meta">
              {severityChip}
              {statusChip}
            </span>
          </span>
        </>
      ) : (
        <>
          <span
            className="problem-dossier__stub"
            data-testid="problem-dossier-stub"
            aria-hidden="true"
          >
            <span
              className="problem-dossier__type-mark"
              data-dossier-type={typeBadge.key}
            />
            <span className="problem-dossier__folio">{formatDossierFolio(id)}</span>
            <span className="problem-dossier__perforation" />
          </span>

          <span className="problem-dossier__body">
            <span className="problem-dossier__headline">
              <span
                className="problem-dossier__type"
                data-testid="problem-dossier-type"
                data-dossier-type={typeBadge.key}
              >
                {typeBadge.label}
              </span>
              <span className="problem-dossier__title" title={title}>
                {title}
              </span>
            </span>

            <span className="problem-dossier__context">
              <CoordinationMark
                className="problem-dossier__mark problem-row__mark my-reports__mark"
                asset={mark.asset}
                code={mark.code}
              />
              <span
                className="problem-dossier__origin"
                data-testid={originTestId}
                title={mark.originLine}
              >
                {mark.originLine}
              </span>
            </span>

            <span className="problem-dossier__meta">
              {severityChip}
              {statusChip}
              {sla ? (
                <span
                  className="problem-dossier__sla"
                  data-testid="problem-dossier-sla"
                  data-sla={sla.tone}
                >
                  <span className="problem-dossier__sla-icon" aria-hidden="true" />
                  {sla.label}
                </span>
              ) : null}
            </span>
          </span>
        </>
      )}
    </button>
  )
}
