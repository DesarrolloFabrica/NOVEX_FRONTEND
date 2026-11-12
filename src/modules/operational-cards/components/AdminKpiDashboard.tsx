import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  analysisPeriodFromMonth,
  buildCurrentCyclePeriod,
  type AnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'
import {
  buildDirectionIntegrityExplanation,
  buildIntegrityExplanation,
} from '@/modules/operational-cards/domain/integrity-policy'
import { bogotaTodayParts } from '@/modules/operational-cards/data/problemHistoryPeriod'
import {
  fetchOperationalKpiDirection,
  fetchOperationalKpiState,
} from '@/modules/operational-cards/services/operational-kpi.service'
import { fetchInternalRecurrence } from '@/modules/operational-cards/services/internal-problems.service'
import { fetchLearningsSummary } from '@/modules/operational-cards/services/learnings.service'
import type {
  OperationalKpiCoordinationSnapshot,
  OperationalKpiDirectionSnapshot,
  OperationalKpiSeverityCounts,
  OperationalKpiStateResponse,
} from '@/modules/operational-cards/types/operational-kpi.types'
import type { InternalRecurrenceResponse } from '@/modules/operational-cards/types/internal-problems.types'
import type { LearningsSummary } from '@/modules/operational-cards/types/learnings.types'
import { IconChevronRight } from '@/modules/operational-cards/components/OperationalIcons'

/**
 * TABLERO DE INDICADORES DEL ADMIN.
 *
 * Lee los mismos KPI que el DIRECTOR (`/operational-kpis/*`, permiso
 * `KPIS_VIEW`) pero los presenta para cualquier lector: cada bloque responde
 * una pregunta en lenguaje llano y dice qué significa la cifra. No recalcula
 * nada: los estados, la salud y los conteos son los que entrega el backend.
 *
 * Reglas que se explican en pantalla (espejo de backend):
 *   · Coordinación CRÍTICA con ≥1 problema crítico, ≥3 altos, ≥5 activos o si
 *     afecta a ≥3 coordinaciones; EN ALERTA con algún activo; ESTABLE sin ninguno.
 *   · Salud 0–10: cada activo resta 2 (crítico o alto) o 1 (medio o bajo).
 */

type Scope = 'direction' | 'coordination'
type PeriodChoice = 'month' | 'cycle'

/** Última lectura del tablero en esta sesión de página (no se persiste). */
let lastReading: { scope: Scope; periodChoice: PeriodChoice } = {
  scope: 'direction',
  periodChoice: 'cycle',
}

export interface AdminKpiDashboardProps {
  /**
   * Carta observada en la mesa. En «Por coordinación» es la ÚNICA fuente de la
   * coordinación que se lee: no hay selector propio, se elige en la baraja.
   */
  selectedCoordinationId: string | null
  labelByCode: Record<string, string>
  colorByCode: Record<string, string>
  onOpenProblem: (problemId: string) => void
  /** Observa una coordinación en la mesa (desde el ranking de la Dirección). */
  onSelectCoordination: (code: string) => void
  /** Avisa al shell de que el tablero espera que se elija una carta. */
  onAwaitingCardChange?: (awaiting: boolean) => void
}

/* ========================================================================== */
/* Presentación                                                                */
/* ========================================================================== */

const STATUS_LABEL: Record<string, string> = {
  CRITICO: 'Crítico',
  ALERTA: 'En alerta',
  ESTABLE: 'Estable',
  DESCONOCIDO: 'Sin datos',
}

const SEVERITY_ROWS: ReadonlyArray<{
  key: keyof OperationalKpiSeverityCounts
  label: string
  tone: string
}> = [
  { key: 'critical', label: 'Crítica', tone: 'critical' },
  { key: 'high', label: 'Alta', tone: 'high' },
  { key: 'medium', label: 'Media', tone: 'medium' },
  { key: 'low', label: 'Baja', tone: 'low' },
]

const AGING_LABEL: Record<string, string> = {
  '0-7': 'Hasta 1 semana',
  '8-14': '1 a 2 semanas',
  '15-30': '2 semanas a 1 mes',
  '31+': 'Más de 1 mes',
}

const SEVERITY_TEXT: Record<string, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

const STATUS_HEADLINE: Record<string, string> = {
  CRITICO: 'La operación necesita atención',
  ALERTA: 'Hay focos que vigilar',
  ESTABLE: 'Todo bajo control',
}

/** Motivo del estado de la Dirección en palabras, a partir de la regla del backend. */
function directionReason(direction: OperationalKpiDirectionSnapshot): string | null {
  const rule = direction.directionIntegrity
  if (!rule) return null
  const total = rule.totalCoordinations
  switch (rule.rule) {
    case 'MULTIPLE_CRITICAL_SIGNALS':
    case 'SINGLE_CRITICAL_SIGNAL':
      return `${rule.criticalSignals} de ${total} coordinaciones están en estado crítico. La Dirección pasa a crítica cuando ${rule.criticalSignalsThreshold} o más lo están.`
    case 'ALERT_THRESHOLD_REACHED':
      return `${rule.alertSignals} de ${total} coordinaciones están en alerta. Con ${rule.alertThreshold} o más, la Dirección pasa a alerta.`
    case 'BELOW_ALERT_THRESHOLD':
      return `Ninguna coordinación está en crítico y menos de ${rule.alertThreshold} están en alerta.`
    case 'NO_COORDINATIONS':
      return 'No hay coordinaciones activas para evaluar.'
    default:
      return null
  }
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function shortBucketLabel(label: string): string {
  // «Jul 2026» → «Jul»; etiquetas de semana o día se dejan tal cual.
  const match = label.match(/^([A-Za-zÁÉÍÓÚáéíóúñ]{3,})\.?\s+\d{4}$/)
  return match ? capitalize(match[1]) : label
}

function Section({
  question,
  help,
  aside,
  children,
}: {
  question: string
  help: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="kpi-section">
      <header className="kpi-section__head">
        <div>
          <h3 className="kpi-section__question">{question}</h3>
          <p className="kpi-section__help">{help}</p>
        </div>
        {aside ? <div className="kpi-section__aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  )
}

function Tile({
  value,
  label,
  hint,
  tone,
}: {
  value: ReactNode
  label: string
  hint: string
  tone?: 'critical' | 'alert' | 'stable' | 'neutral'
}) {
  return (
    <div className="kpi-tile" data-tone={tone ?? 'neutral'}>
      <strong className="kpi-tile__value">{value}</strong>
      <span className="kpi-tile__label">{label}</span>
      <span className="kpi-tile__hint">{hint}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="kpi-status" data-status={status}>
      <span className="kpi-status__dot" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function SeverityBreakdown({ severity }: { severity: OperationalKpiSeverityCounts }) {
  const total = severity.critical + severity.high + severity.medium + severity.low
  if (total === 0) {
    return <p className="kpi-empty">No hay problemas activos que clasificar.</p>
  }
  return (
    <div className="kpi-stack">
      <div className="kpi-stack__bar" role="img" aria-label="Distribución por gravedad">
        {SEVERITY_ROWS.map((row) =>
          severity[row.key] > 0 ? (
            <span
              key={row.key}
              className="kpi-stack__segment"
              data-tone={row.tone}
              style={{ flexGrow: severity[row.key] }}
              title={`${row.label}: ${severity[row.key]}`}
            />
          ) : null,
        )}
      </div>
      <ul className="kpi-legend">
        {SEVERITY_ROWS.map((row) => (
          <li key={row.key} data-tone={row.tone}>
            <span className="kpi-legend__swatch" aria-hidden="true" />
            <span className="kpi-legend__label">{row.label}</span>
            <strong>{severity[row.key]}</strong>
            <span className="kpi-legend__pct">{pct(severity[row.key], total)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HealthMeter({ points }: { points: number | null }) {
  if (points === null) return null
  const tone = points <= 3 ? 'critical' : points <= 6 ? 'alert' : 'stable'
  return (
    <div className="kpi-health" data-tone={tone}>
      <div className="kpi-health__top">
        <span>Salud</span>
        <strong>{points} / 10</strong>
      </div>
      <div className="kpi-health__track" aria-hidden="true">
        <span style={{ width: `${points * 10}%` }} />
      </div>
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="kpi-loading" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="kpi-error" role="alert">
      <strong>No pudimos cargar estos indicadores</strong>
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido.'
}

/* ========================================================================== */
/* Componente principal                                                        */
/* ========================================================================== */

export function AdminKpiDashboard({
  selectedCoordinationId,
  labelByCode,
  colorByCode,
  onOpenProblem,
  onSelectCoordination,
  onAwaitingCardChange,
}: AdminKpiDashboardProps) {
  // Se recuerda la última lectura: abrir un expediente y volver no la pierde.
  const [scope, setScope] = useState<Scope>(lastReading.scope)
  const [periodChoice, setPeriodChoice] = useState<PeriodChoice>(
    lastReading.periodChoice,
  )

  useEffect(() => {
    lastReading = { scope, periodChoice }
  }, [scope, periodChoice])

  const [direction, setDirection] = useState<OperationalKpiDirectionSnapshot | null>(null)
  const [directionError, setDirectionError] = useState<string | null>(null)
  const [directionAttempt, setDirectionAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setDirectionError(null)
    fetchOperationalKpiDirection()
      .then((response) => {
        if (!cancelled) setDirection(response.direction)
      })
      .catch((error: unknown) => {
        if (!cancelled) setDirectionError(errorText(error))
      })
    return () => {
      cancelled = true
    }
  }, [directionAttempt])

  const coordinations = direction?.coordinations ?? []
  const labelOf = (row: OperationalKpiCoordinationSnapshot) =>
    labelByCode[row.coordination.code] ?? row.coordination.name

  const selectedRow = selectedCoordinationId
    ? (coordinations.find((row) => row.coordination.id === selectedCoordinationId) ?? null)
    : null
  const awaitingCard = scope === 'coordination' && !selectedCoordinationId

  useEffect(() => {
    onAwaitingCardChange?.(awaitingCard)
  }, [awaitingCard, onAwaitingCardChange])

  useEffect(() => () => onAwaitingCardChange?.(false), [onAwaitingCardChange])

  /*
   * «Por coordinación» lee la carta que ya se observa en la mesa. Antes la
   * soltaba: el panel central saltaba a «Resumen de Dirección» y volver a
   * «Toda la Dirección» no la recuperaba. Solo sin carta se pide elegir una.
   */
  const enterCoordinationScope = () => setScope('coordination')

  /** Desde el ranking: observa esa carta en la mesa y abre su lectura. */
  const openCoordination = (id: string) => {
    const row = coordinations.find((item) => item.coordination.id === id)
    if (!row) return
    setScope('coordination')
    onSelectCoordination(row.coordination.code)
  }

  return (
    <div className="kpi-dashboard" data-scope={scope}>
      <div className="kpi-toolbar">
        <div className="kpi-segmented" role="group" aria-label="Alcance de los indicadores">
          <button
            type="button"
            aria-pressed={scope === 'direction'}
            onClick={() => setScope('direction')}
          >
            Toda la Dirección
          </button>
          <button
            type="button"
            aria-pressed={scope === 'coordination'}
            onClick={enterCoordinationScope}
          >
            Por coordinación
          </button>
        </div>

        {scope === 'coordination' ? (
          <div className="kpi-toolbar__row">
            <div className="kpi-picked" data-empty={selectedRow ? 'false' : 'true'}>
              <span className="kpi-picked__label">Coordinación</span>
              {selectedRow ? (
                <span className="kpi-picked__value">
                  <span
                    className="kpi-picked__dot"
                    style={{
                      backgroundColor:
                        colorByCode[selectedRow.coordination.code] ?? '#b98a26',
                    }}
                    aria-hidden="true"
                  />
                  {labelOf(selectedRow)}
                  <small>· cambie de carta en la mesa para comparar</small>
                </span>
              ) : (
                <span className="kpi-picked__value kpi-picked__value--empty">
                  Ninguna seleccionada
                </span>
              )}
            </div>
            <div className="kpi-segmented kpi-segmented--small" role="group" aria-label="Período">
              <button
                type="button"
                aria-pressed={periodChoice === 'month'}
                onClick={() => setPeriodChoice('month')}
              >
                Este mes
              </button>
              <button
                type="button"
                aria-pressed={periodChoice === 'cycle'}
                onClick={() => setPeriodChoice('cycle')}
              >
                Ciclo actual
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {directionError ? (
        <ErrorBlock
          message={directionError}
          onRetry={() => setDirectionAttempt((value) => value + 1)}
        />
      ) : !direction ? (
        <LoadingBlock />
      ) : scope === 'direction' ? (
        <DirectionView
          direction={direction}
          labelOf={labelOf}
          colorByCode={colorByCode}
          onOpenCoordination={openCoordination}
        />
      ) : selectedCoordinationId ? (
        <CoordinationView
          key={`${selectedCoordinationId}-${periodChoice}`}
          snapshot={selectedRow}
          label={selectedRow ? labelOf(selectedRow) : 'Coordinación'}
          coordinationId={selectedCoordinationId}
          periodChoice={periodChoice}
          onOpenProblem={onOpenProblem}
        />
      ) : (
        <PickCardPrompt />
      )}
    </div>
  )
}

/** Estado de espera: los indicadores por coordinación se eligen en la mesa. */
function PickCardPrompt() {
  return (
    <div className="kpi-pick" role="status">
      <span className="kpi-pick__icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
          <rect
            x="9"
            y="8"
            width="20"
            height="28"
            rx="3"
            stroke="currentColor"
            strokeWidth="2.2"
            transform="rotate(-10 19 22)"
          />
          <rect
            x="19"
            y="10"
            width="20"
            height="28"
            rx="3"
            fill="#fffaf0"
            stroke="currentColor"
            strokeWidth="2.2"
            transform="rotate(8 29 24)"
          />
        </svg>
      </span>
      <strong>Elija una carta en la mesa</strong>
      <p>
        Pulse cualquier coordinación de la baraja de abajo y aquí verá su estado, su
        actividad, cuánto llevan abiertos sus problemas y qué tipos se repiten.
      </p>
      <span className="kpi-pick__hint">
        <span className="kpi-pick__arrow" aria-hidden="true">↙</span>
        Puede cambiar de carta cuando quiera: el tablero se actualiza solo.
      </span>
    </div>
  )
}

/* ========================================================================== */
/* Toda la Dirección                                                           */
/* ========================================================================== */

function DirectionView({
  direction,
  labelOf,
  colorByCode,
  onOpenCoordination,
}: {
  direction: OperationalKpiDirectionSnapshot
  labelOf: (row: OperationalKpiCoordinationSnapshot) => string
  colorByCode: Record<string, string>
  onOpenCoordination: (id: string) => void
}) {
  const { problems, coordinationStatusTotals: totals } = direction
  const explanation = buildDirectionIntegrityExplanation(
    direction.directionStatus,
    direction.directionIntegrity,
  )
  const totalCoordinations =
    totals.critical + totals.alert + totals.stable + totals.unknown

  const withProblems = useMemo(
    () =>
      direction.coordinations
        .filter((row) => row.problems.activeCount > 0)
        .sort(
          (left, right) =>
            right.problems.activeCount - left.problems.activeCount ||
            right.problems.severity.critical - left.problems.severity.critical,
        ),
    [direction.coordinations],
  )
  const calm = direction.coordinations.filter((row) => row.problems.activeCount === 0)
  const maxActive = Math.max(1, ...withProblems.map((row) => row.problems.activeCount))

  return (
    <>
      <article className="kpi-hero" data-status={direction.directionStatus}>
        <div className="kpi-hero__top">
          <span className="kpi-hero__eyebrow">Estado general de la Dirección</span>
          <StatusBadge status={direction.directionStatus} />
        </div>
        <p className="kpi-hero__headline">{STATUS_HEADLINE[direction.directionStatus] ?? explanation.headline}</p>
        <p className="kpi-hero__detail">
          {directionReason(direction) ?? capitalize(explanation.detail)}
        </p>
      </article>

      <div className="kpi-tiles">
        <Tile
          value={problems.activeCount}
          label="Problemas activos"
          hint="Abiertos o en atención ahora"
        />
        <Tile
          value={problems.severity.critical}
          label="Críticos"
          hint="Requieren atención inmediata"
          tone={problems.severity.critical > 0 ? 'critical' : 'stable'}
        />
        <Tile
          value={problems.status.inProgress}
          label="En atención"
          hint={`${pct(problems.status.inProgress, problems.activeCount)} % ya tiene responsable trabajando`}
          tone="stable"
        />
        <Tile
          value={problems.status.open}
          label="Sin iniciar"
          hint="Abiertos, aún nadie los trabaja"
          tone={problems.status.open > 0 ? 'alert' : 'stable'}
        />
      </div>

      <Section
        question="¿Qué tan graves son los problemas activos?"
        help="Cada problema se clasifica de Baja a Crítica según su impacto en la operación."
      >
        <SeverityBreakdown severity={problems.severity} />
      </Section>

      <Section
        question="¿Cómo están las coordinaciones?"
        help={`De ${plural(totalCoordinations, 'coordinación', 'coordinaciones')}, así se reparte su estado hoy.`}
      >
        <div className="kpi-status-grid">
          <div className="kpi-status-card" data-status="CRITICO">
            <strong>{totals.critical}</strong>
            <span>Críticas</span>
          </div>
          <div className="kpi-status-card" data-status="ALERTA">
            <strong>{totals.alert}</strong>
            <span>En alerta</span>
          </div>
          <div className="kpi-status-card" data-status="ESTABLE">
            <strong>{totals.stable}</strong>
            <span>Estables</span>
          </div>
        </div>
        <details className="kpi-rule">
          <summary>¿Cómo se decide el estado?</summary>
          <ul>
            <li>
              <b>Crítica</b>: tiene al menos 1 problema crítico, 3 altos o 5 activos, o
              afecta a 3 coordinaciones o más.
            </li>
            <li>
              <b>En alerta</b>: tiene problemas activos sin llegar a esos umbrales.
            </li>
            <li>
              <b>Estable</b>: no tiene problemas activos.
            </li>
            <li>
              La <b>Dirección</b> pasa a crítica cuando{' '}
              {direction.directionIntegrity?.criticalSignalsThreshold ?? 2} o más
              coordinaciones están en crítico.
            </li>
          </ul>
        </details>
      </Section>

      <Section
        question="¿Dónde se concentran los problemas?"
        help="Coordinaciones con problemas activos, de mayor a menor. Pulse una para ver su detalle."
      >
        {withProblems.length === 0 ? (
          <p className="kpi-empty">Ninguna coordinación tiene problemas activos.</p>
        ) : (
          <ul className="kpi-ranking">
            {withProblems.map((row) => (
              <li key={row.coordination.id}>
                <button
                  type="button"
                  className="kpi-ranking__row"
                  onClick={() => onOpenCoordination(row.coordination.id)}
                >
                  <span className="kpi-ranking__name">
                    <span
                      className="kpi-ranking__dot"
                      style={{
                        backgroundColor: colorByCode[row.coordination.code] ?? '#b98a26',
                      }}
                      aria-hidden="true"
                    />
                    {labelOf(row)}
                  </span>
                  <span className="kpi-ranking__bar" aria-hidden="true">
                    <span
                      data-status={row.integrityStatus}
                      style={{
                        width: `${(row.problems.activeCount / maxActive) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="kpi-ranking__meta">
                    <strong>{row.problems.activeCount}</strong>{' '}
                    {row.problems.activeCount === 1 ? 'activo' : 'activos'}
                    {row.problems.severity.critical > 0
                      ? ` · ${row.problems.severity.critical} crít.`
                      : ''}
                  </span>
                  <StatusBadge status={row.integrityStatus} />
                  <span className="kpi-ranking__chevron" aria-hidden="true">
                    <IconChevronRight size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {calm.length > 0 ? (
          <p className="kpi-calm">
            <b>Sin problemas activos:</b> {calm.map(labelOf).join(', ')}.
          </p>
        ) : null}
      </Section>
    </>
  )
}

/* ========================================================================== */
/* Por coordinación                                                            */
/* ========================================================================== */

type Loadable<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

function buildPeriod(choice: PeriodChoice): AnalysisPeriod {
  if (choice === 'cycle') return buildCurrentCyclePeriod()
  const { year, monthIndex } = bogotaTodayParts()
  return analysisPeriodFromMonth(year, monthIndex)
}

function CoordinationView({
  snapshot,
  label,
  coordinationId,
  periodChoice,
  onOpenProblem,
}: {
  snapshot: OperationalKpiCoordinationSnapshot | null
  label: string
  coordinationId: string
  periodChoice: PeriodChoice
  onOpenProblem: (problemId: string) => void
}) {
  const period = useMemo(() => buildPeriod(periodChoice), [periodChoice])
  const [state, setState] = useState<Loadable<OperationalKpiStateResponse>>({ status: 'loading' })
  const [recurrence, setRecurrence] = useState<Loadable<InternalRecurrenceResponse>>({
    status: 'loading',
  })
  const [learnings, setLearnings] = useState<Loadable<LearningsSummary>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const query = {
      kind: period.kind,
      from: period.from,
      to: period.to,
      calendarEnd: period.calendarEnd,
    }
    setState({ status: 'loading' })
    setRecurrence({ status: 'loading' })
    setLearnings({ status: 'loading' })
    fetchOperationalKpiState({ coordinationId, ...query })
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', message: errorText(error) }))
    fetchInternalRecurrence({ coordinationId, period: query })
      .then((data) => !cancelled && setRecurrence({ status: 'ready', data }))
      .catch((error: unknown) => !cancelled && setRecurrence({ status: 'error', message: errorText(error) }))
    fetchLearningsSummary({ coordinationId, period: query })
      .then((data) => !cancelled && setLearnings({ status: 'ready', data }))
      .catch((error: unknown) => !cancelled && setLearnings({ status: 'error', message: errorText(error) }))
    return () => {
      cancelled = true
    }
  }, [coordinationId, period, attempt])

  const retry = () => setAttempt((value) => value + 1)
  const periodName = periodChoice === 'month' ? 'este mes' : 'el ciclo actual'

  const status = snapshot?.integrityStatus ?? 'DESCONOCIDO'
  const severity = snapshot?.problems.severity
  const explanation = buildIntegrityExplanation(status, {
    activeCount: snapshot?.problems.activeCount ?? 0,
    criticalCount: severity?.critical ?? 0,
    highCount: severity?.high ?? 0,
    mediumCount: severity?.medium ?? 0,
    lowCount: severity?.low ?? 0,
    incomingDependencyCount: snapshot?.dependencies.incoming ?? 0,
  })

  return (
    <>
      <article className="kpi-hero" data-status={status}>
        <div className="kpi-hero__top">
          <span className="kpi-hero__eyebrow">{label}</span>
          <StatusBadge status={status} />
        </div>
        <p className="kpi-hero__headline">{STATUS_HEADLINE[status] ?? explanation.headline}</p>
        <p className="kpi-hero__detail">
          {status === 'ESTABLE' ? 'No tiene problemas activos.' : `Motivo: ${explanation.detail}`}
        </p>
        <HealthMeter points={snapshot?.lifePoints ?? null} />
        <p className="kpi-hero__note">
          La salud parte de 10 y baja con cada problema activo: 2 puntos si es
          crítico o alto, 1 si es medio o bajo. Se recupera al resolverlos.
        </p>
      </article>

      {state.status === 'loading' ? <LoadingBlock /> : null}
      {state.status === 'error' ? <ErrorBlock message={state.message} onRetry={retry} /> : null}

      {state.status === 'ready' ? (
        <StateSections
          state={state.data}
          periodName={periodName}
          onOpenProblem={onOpenProblem}
        />
      ) : null}

      <Section
        question="¿Qué tipo de problemas se repiten?"
        help={`Problemas internos reportados en ${periodName}, agrupados por tipo.`}
      >
        {recurrence.status === 'loading' ? <LoadingBlock /> : null}
        {recurrence.status === 'error' ? (
          <ErrorBlock message={recurrence.message} onRetry={retry} />
        ) : null}
        {recurrence.status === 'ready' ? (
          <CategoryBars recurrence={recurrence.data} />
        ) : null}
      </Section>

      <Section
        question="¿Se están registrando aprendizajes?"
        help="Al cerrar un problema se puede dejar la lección aprendida para no repetirlo."
      >
        {learnings.status === 'loading' ? <LoadingBlock /> : null}
        {learnings.status === 'error' ? (
          <ErrorBlock message={learnings.message} onRetry={retry} />
        ) : null}
        {learnings.status === 'ready' ? <LearningsBlock summary={learnings.data} /> : null}
      </Section>
    </>
  )
}

function StateSections({
  state,
  periodName,
  onOpenProblem,
}: {
  state: OperationalKpiStateResponse
  periodName: string
  onOpenProblem: (problemId: string) => void
}) {
  const buckets = state.evolution.buckets.filter((bucket) => !bucket.future)
  const created = buckets.reduce((sum, bucket) => sum + (bucket.created ?? 0), 0)
  const closed = buckets.reduce((sum, bucket) => sum + (bucket.closed ?? 0), 0)
  const maxFlow = Math.max(
    1,
    ...buckets.map((bucket) => Math.max(bucket.created ?? 0, bucket.closed ?? 0)),
  )
  const { aging, snapshot, resolution } = state
  const maxBand = Math.max(1, ...aging.bands.map((band) => band.count))

  return (
    <>
      <div className="kpi-tiles">
        <Tile
          value={state.activeAtPeriodEnd.count}
          label="Activos ahora"
          hint="Abiertos o en atención"
        />
        <Tile
          value={snapshot.severity.critical}
          label="Críticos"
          hint="Requieren atención inmediata"
          tone={snapshot.severity.critical > 0 ? 'critical' : 'stable'}
        />
        <Tile
          value={aging.medianAgeDays === null ? '—' : `${aging.medianAgeDays} d`}
          label="Antigüedad típica"
          hint={
            aging.medianAgeDays === null
              ? 'Sin problemas activos'
              : `La mitad lleva más de ${plural(aging.medianAgeDays, 'día', 'días')} abierta`
          }
          tone={(aging.medianAgeDays ?? 0) > 14 ? 'alert' : 'neutral'}
        />
        <Tile
          value={resolution.closedCount}
          label={`Cerrados en ${periodName}`}
          hint={
            resolution.medianDays === null
              ? 'Aún sin cierres en el período'
              : `Tardan unos ${plural(Math.round(resolution.medianDays), 'día', 'días')} en cerrarse`
          }
          tone="stable"
        />
      </div>

      <Section
        question={`¿Cuánto trabajo entró y salió en ${periodName}?`}
        help="Reportados: problemas nuevos. Cerrados: problemas resueltos. Si entran más de los que salen, la carga crece."
        aside={
          <span className="kpi-balance" data-trend={created > closed ? 'up' : 'down'}>
            {created > closed
              ? `+${created - closed} pendientes`
              : created < closed
                ? `${closed - created} menos pendientes`
                : 'Carga estable'}
          </span>
        }
      >
        <div className="kpi-flow">
          {buckets.map((bucket) => (
            <div key={bucket.start} className="kpi-flow__col" data-current={bucket.current}>
              <div className="kpi-flow__bars">
                <span
                  className="kpi-flow__bar"
                  data-kind="created"
                  style={{ height: `${((bucket.created ?? 0) / maxFlow) * 100}%` }}
                >
                  <em>{bucket.created ?? 0}</em>
                </span>
                <span
                  className="kpi-flow__bar"
                  data-kind="closed"
                  style={{ height: `${((bucket.closed ?? 0) / maxFlow) * 100}%` }}
                >
                  <em>{bucket.closed ?? 0}</em>
                </span>
              </div>
              <span className="kpi-flow__label">{shortBucketLabel(bucket.label)}</span>
            </div>
          ))}
        </div>
        <ul className="kpi-legend kpi-legend--inline">
          <li data-tone="created">
            <span className="kpi-legend__swatch" aria-hidden="true" />
            <span className="kpi-legend__label">Reportados</span>
            <strong>{created}</strong>
          </li>
          <li data-tone="closed">
            <span className="kpi-legend__swatch" aria-hidden="true" />
            <span className="kpi-legend__label">Cerrados</span>
            <strong>{closed}</strong>
          </li>
        </ul>
      </Section>

      <Section
        question="¿Cuánto tiempo llevan abiertos?"
        help="Edad de los problemas activos desde que se reportaron. Los más antiguos suelen tener el plazo (SLA) vencido."
      >
        {aging.activeCount === 0 ? (
          <p className="kpi-empty">No hay problemas activos.</p>
        ) : (
          <>
            <ul className="kpi-bands">
              {aging.bands.map((band) => (
                <li key={band.key}>
                  <span className="kpi-bands__label">{AGING_LABEL[band.key] ?? band.key}</span>
                  <span className="kpi-bands__track" aria-hidden="true">
                    <span
                      data-band={band.key}
                      style={{ width: `${(band.count / maxBand) * 100}%` }}
                    />
                  </span>
                  <strong>{band.count}</strong>
                </li>
              ))}
            </ul>
            {aging.oldest.length > 0 ? (
              <div className="kpi-oldest">
                <h4>Los que más esperan</h4>
                <ul>
                  {aging.oldest.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="kpi-oldest__row"
                        onClick={() => onOpenProblem(item.id)}
                        title="Abrir expediente"
                      >
                        <span className="kpi-oldest__age">
                          <strong>{item.ageDays}</strong> días
                        </span>
                        <span className="kpi-oldest__title">{item.title}</span>
                        <span className="kpi-oldest__tags">
                          <span className="kpi-tag" data-severity={item.severity}>
                            {SEVERITY_TEXT[item.severity] ?? item.severity}
                          </span>
                          {item.slaOverdue ? (
                            <span className="kpi-tag" data-tone="overdue">
                              Plazo vencido
                            </span>
                          ) : null}
                        </span>
                        <span className="kpi-oldest__chevron" aria-hidden="true">
                          <IconChevronRight size={14} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </Section>

      <Section
        question="¿Qué tan graves son y quién los atiende?"
        help="Gravedad de los problemas activos y si ya hay alguien trabajándolos."
      >
        <SeverityBreakdown severity={snapshot.severity} />
        {snapshot.activeCount > 0 ? (
          <div className="kpi-attention">
            <div className="kpi-attention__item" data-tone="open">
              <strong>{snapshot.attention.open}</strong>
              <span>Sin iniciar</span>
            </div>
            <div className="kpi-attention__item" data-tone="progress">
              <strong>{snapshot.attention.inProgress}</strong>
              <span>En atención</span>
            </div>
            <p>
              {pct(snapshot.attention.inProgress, snapshot.activeCount)} % de los problemas
              activos ya tiene a alguien trabajando en ellos.
            </p>
          </div>
        ) : null}
      </Section>
    </>
  )
}

function CategoryBars({ recurrence }: { recurrence: InternalRecurrenceResponse }) {
  const categories = [...recurrence.categories]
    .filter((category) => category.totalCreated > 0)
    .sort((left, right) => right.totalCreated - left.totalCreated)
    .slice(0, 5)
  if (categories.length === 0) {
    return <p className="kpi-empty">No se reportaron problemas internos en el período.</p>
  }
  const max = Math.max(1, ...categories.map((category) => category.totalCreated))
  return (
    <ul className="kpi-bands kpi-bands--categories">
      {categories.map((category) => (
        <li key={category.id}>
          <span className="kpi-bands__label">{category.name}</span>
          <span className="kpi-bands__track" aria-hidden="true">
            <span style={{ width: `${(category.totalCreated / max) * 100}%` }} />
          </span>
          <strong>{category.totalCreated}</strong>
        </li>
      ))}
    </ul>
  )
}

function LearningsBlock({ summary }: { summary: LearningsSummary }) {
  if (summary.closedCount === 0) {
    return (
      <p className="kpi-empty">
        Aún no hay problemas cerrados en el período, así que no hay lecciones que contar.
      </p>
    )
  }
  const coverage = summary.coverage ?? 0
  return (
    <div className="kpi-learning">
      <div className="kpi-learning__ring" style={{ ['--coverage' as string]: `${coverage}%` }}>
        <strong>{coverage} %</strong>
      </div>
      <p>
        <b>
          {summary.learningCount} de {plural(summary.closedCount, 'cierre', 'cierres')}
        </b>{' '}
        dejaron una lección registrada.
        {summary.withoutLearningCount > 0
          ? ` A ${plural(summary.withoutLearningCount, 'cierre', 'cierres')} le falta documentar qué se aprendió.`
          : ' Todos los cierres están documentados.'}
      </p>
    </div>
  )
}
