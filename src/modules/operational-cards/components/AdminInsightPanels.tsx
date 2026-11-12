import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchSituations } from '@/modules/api/situations.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { AdminKpiDashboard } from '@/modules/operational-cards/components/AdminKpiDashboard'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import {
  IconBan,
  IconBarChart,
  IconBook,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconGear,
  IconSwap,
} from '@/modules/operational-cards/components/OperationalIcons'

/**
 * Vistas de consulta del ADMIN en el panel derecho.
 *
 * Las tres tarjetas guía del menú («Gestión de Situaciones Operativas»,
 * «Historial y Aprendizajes» y «Acciones Administrativas») eran texto sin
 * destino. Cada una abre aquí una lectura construida con el MISMO listado de
 * situaciones que usa el resto del Centro (`GET /situations`): no hay datos
 * inventados ni un endpoint nuevo. El endpoint de aprendizajes por KPI exige
 * `KPIS_VIEW`, que el ADMIN no tiene, así que el historial de aprendizajes sale
 * de las situaciones cerradas y de su registro de resolución.
 */
export type AdminInsightView =
  | 'operations'
  | 'learnings'
  | 'admin-actions'
  | 'kpis'

export interface AdminInsightPanelProps {
  view: AdminInsightView
  onBack: () => void
  /** Abre el expediente de una situación en el panel derecho. */
  onOpenSituation: (situation: SituationResponse) => void
  labelByCode: Record<string, string>
  colorByCode: Record<string, string>
  /**
   * Alcance que se nombra en la cabecera. El backend ya limita lo que cada
   * rol ve; el COORDINADOR lee «mi coordinación», no «todas».
   */
  scopeLabel?: string
  /** Contexto de la vista de indicadores (KPI). */
  kpi?: {
    selectedCoordination: CoordinationOverview | null
    selectedLabel: string | null
    openProblemId: string | null
    onOpenProblem: (problemId: string) => void
    onSelectCoordination: (code: string) => void
    onAwaitingCardChange: (awaiting: boolean) => void
  }
}

export function AdminInsightPanel(props: AdminInsightPanelProps) {
  switch (props.view) {
    case 'operations':
      return <OperationsView {...props} />
    case 'learnings':
      return <LearningsView {...props} />
    case 'admin-actions':
      return <AdminActionsView {...props} />
    case 'kpis':
      return <KpiView {...props} />
  }
}

/* ========================================================================== */
/* Datos                                                                       */
/* ========================================================================== */

const PAGE_LIMIT = 100

/** Lista vacía estable: evita recalcular memos mientras carga. */
const NO_SITUATIONS: SituationResponse[] = []

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: SituationResponse[] }

function useSituationsByStatus(statuses: readonly string[]): {
  state: LoadState
  retry: () => void
} {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const key = statuses.join(',')

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    Promise.all(
      key.split(',').map((status) =>
        fetchSituations({ status, limit: PAGE_LIMIT, page: 1 }),
      ),
    )
      .then((responses) => {
        if (cancelled) return
        setState({
          status: 'ready',
          items: responses.flatMap((response) => response.items),
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo consultar las situaciones.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [key, attempt])

  return { state, retry: () => setAttempt((value) => value + 1) }
}

/* ========================================================================== */
/* Presentación compartida                                                     */
/* ========================================================================== */

const TIME_ZONE = 'America/Bogota'

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
  CANCELLED: 'Anulado',
}

const SLA_LABEL: Record<string, string> = {
  on_track: 'SLA en plazo',
  at_risk: 'SLA en riesgo',
  overdue: 'SLA vencido',
  closed: 'SLA cerrado',
}

const shortDate = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

const monthLabel = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return shortDate.format(new Date(iso)).replace('.', '')
}

function daysSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  )
}

function ageLabel(iso: string): string {
  const days = daysSince(iso)
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function coordinationLabel(
  situation: SituationResponse,
  labelByCode: Record<string, string>,
): string {
  const code = situation.coordinationCode ?? ''
  return labelByCode[code] ?? situation.coordinationName ?? 'Sin coordinación'
}

function percent(part: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((part / total) * 100)} %`
}

export function InsightHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  onBack,
}: {
  icon: ReactNode
  eyebrow: string
  title: string
  subtitle: string
  /** Sin destino (p. ej. el DIRECTOR, sin menú) no se pinta «Volver». */
  onBack?: () => void
}) {
  return (
    <header className="admin-insight__header">
      <div className="admin-insight__topline">
        {onBack ? (
          <button
            type="button"
            className="admin-insight__back"
            onClick={onBack}
            aria-label="Volver al menú"
            title="Volver al menú"
          >
            <IconChevronLeft size={16} />
          </button>
        ) : null}
        <span className="admin-insight__eyebrow">{eyebrow}</span>
      </div>
      <div className="admin-insight__title-row">
        <span className="admin-insight__title-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className="admin-insight__title">{title}</h2>
          <p className="admin-insight__subtitle">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}

function Metric({
  value,
  label,
  tone,
}: {
  value: string | number
  label: string
  tone?: 'critical' | 'alert' | 'stable' | 'neutral'
}) {
  return (
    <div className="admin-insight__metric" data-tone={tone ?? 'neutral'}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string; count?: number }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="admin-insight__segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="admin-insight__segmented-count">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="admin-insight__loading" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="admin-insight__empty" role="alert">
      <strong>No pudimos cargar la información</strong>
      <span>{message}</span>
      <button type="button" className="admin-insight__retry" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

function EmptyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="admin-insight__empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function SituationRow({
  situation,
  labelByCode,
  colorByCode,
  onOpen,
  meta,
  children,
}: {
  situation: SituationResponse
  labelByCode: Record<string, string>
  colorByCode: Record<string, string>
  onOpen: (situation: SituationResponse) => void
  meta: ReactNode
  children?: ReactNode
}) {
  const color = colorByCode[situation.coordinationCode ?? ''] ?? '#b98a26'
  return (
    <li>
      <button
        type="button"
        className="admin-insight__row"
        data-severity={situation.severity}
        onClick={() => onOpen(situation)}
        title="Abrir expediente"
      >
        <span className="admin-insight__row-severity" aria-hidden="true" />
        <span className="admin-insight__row-body">
          <span className="admin-insight__row-coord">
            <span
              className="admin-insight__row-dot"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {coordinationLabel(situation, labelByCode)}
          </span>
          <span className="admin-insight__row-title">{situation.title}</span>
          <span className="admin-insight__row-meta">{meta}</span>
          {children}
        </span>
        <span className="admin-insight__row-chevron" aria-hidden="true">
          <IconChevronRight size={16} />
        </span>
      </button>
    </li>
  )
}

function Pill({
  tone,
  children,
}: {
  tone: 'critical' | 'alert' | 'stable' | 'neutral' | 'admin'
  children: ReactNode
}) {
  return (
    <span className="admin-insight__pill" data-tone={tone}>
      {children}
    </span>
  )
}

function severityTone(severity: string): 'critical' | 'alert' | 'neutral' {
  if (severity === 'CRITICAL') return 'critical'
  if (severity === 'HIGH') return 'alert'
  return 'neutral'
}

function slaTone(health: string | undefined): 'critical' | 'alert' | 'stable' | 'neutral' {
  if (health === 'overdue') return 'critical'
  if (health === 'at_risk') return 'alert'
  if (health === 'on_track') return 'stable'
  return 'neutral'
}

/* ========================================================================== */
/* Gestión de situaciones operativas                                           */
/* ========================================================================== */

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS'] as const

type OperationsFilter = 'all' | 'critical' | 'overdue' | 'in-progress'

function priorityOf(situation: SituationResponse): number {
  const overdue = situation.slaHealth === 'overdue' ? 100 : 0
  const risk = situation.slaHealth === 'at_risk' ? 50 : 0
  return overdue + risk + (SEVERITY_RANK[situation.severity] ?? 0) * 10
}

function OperationsView({
  onBack,
  onOpenSituation,
  labelByCode,
  colorByCode,
  scopeLabel = 'todas las coordinaciones',
}: AdminInsightPanelProps) {
  const { state, retry } = useSituationsByStatus(ACTIVE_STATUSES)
  const [filter, setFilter] = useState<OperationsFilter>('all')

  const items = state.status === 'ready' ? state.items : NO_SITUATIONS
  const counts = useMemo(
    () => ({
      all: items.length,
      critical: items.filter((s) => s.severity === 'CRITICAL').length,
      overdue: items.filter((s) => s.slaHealth === 'overdue').length,
      atRisk: items.filter((s) => s.slaHealth === 'at_risk').length,
      inProgress: items.filter((s) => s.status === 'IN_PROGRESS').length,
      coordinations: new Set(items.map((s) => s.coordinationCode)).size,
    }),
    [items],
  )

  const visible = useMemo(() => {
    const filtered = items.filter((situation) => {
      if (filter === 'critical') return situation.severity === 'CRITICAL'
      if (filter === 'overdue') return situation.slaHealth === 'overdue'
      if (filter === 'in-progress') return situation.status === 'IN_PROGRESS'
      return true
    })
    return filtered.sort(
      (left, right) =>
        priorityOf(right) - priorityOf(left) ||
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
  }, [items, filter])

  return (
    <section className="admin-insight" data-view="operations">
      <InsightHeader
        icon={<IconGear size={22} />}
        eyebrow={`Consulta · ${scopeLabel}`}
        title="Gestión de Situaciones Operativas"
        subtitle="Situaciones activas ordenadas por prioridad: SLA vencido y severidad primero."
        onBack={onBack}
      />

      {state.status === 'loading' ? <LoadingBlock /> : null}
      {state.status === 'error' ? (
        <ErrorBlock message={state.message} onRetry={retry} />
      ) : null}

      {state.status === 'ready' ? (
        <>
          <div className="admin-insight__metrics">
            <Metric value={counts.all} label="Activas" />
            <Metric value={counts.critical} label="Críticas" tone="critical" />
            <Metric value={counts.overdue} label="SLA vencido" tone="critical" />
            <Metric value={counts.inProgress} label="En progreso" tone="stable" />
          </div>

          <p className="admin-insight__caption">
            {counts.all} situaciones activas en {counts.coordinations}{' '}
            coordinaciones · {counts.atRisk} con SLA en riesgo.
          </p>

          <Segmented<OperationsFilter>
            label="Filtrar situaciones"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Todas', count: counts.all },
              { value: 'critical', label: 'Críticas', count: counts.critical },
              { value: 'overdue', label: 'SLA vencido', count: counts.overdue },
              { value: 'in-progress', label: 'En progreso', count: counts.inProgress },
            ]}
          />

          {visible.length === 0 ? (
            <EmptyBlock
              title="Sin situaciones en este filtro"
              text="Pruebe con otro filtro para ver el resto de situaciones activas."
            />
          ) : (
            <ul className="admin-insight__list">
              {visible.map((situation) => (
                <SituationRow
                  key={situation.id}
                  situation={situation}
                  labelByCode={labelByCode}
                  colorByCode={colorByCode}
                  onOpen={onOpenSituation}
                  meta={
                    <>
                      <Pill tone={severityTone(situation.severity)}>
                        {SEVERITY_LABEL[situation.severity] ?? situation.severity}
                      </Pill>
                      <Pill tone="neutral">
                        {STATUS_LABEL[situation.status] ?? situation.status}
                      </Pill>
                      {situation.slaHealth ? (
                        <Pill tone={slaTone(situation.slaHealth)}>
                          {SLA_LABEL[situation.slaHealth]}
                        </Pill>
                      ) : null}
                      <span className="admin-insight__row-age">
                        {ageLabel(situation.occurredAt ?? situation.createdAt)}
                      </span>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}

/* ========================================================================== */
/* Historial y aprendizajes                                                    */
/* ========================================================================== */

const CLOSED_STATUSES = ['CLOSED'] as const

type Grouping = 'week' | 'month' | 'cycle'

function bogotaParts(iso: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function groupKey(iso: string, grouping: Grouping): { key: string; label: string } {
  const { year, month, day } = bogotaParts(iso)
  if (grouping === 'cycle') {
    const half = month <= 6 ? 1 : 2
    return {
      key: `${year}-H${half}`,
      label: `Ciclo ${half} · ${year} (${half === 1 ? 'enero–junio' : 'julio–diciembre'})`,
    }
  }
  if (grouping === 'month') {
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: capitalize(monthLabel.format(new Date(Date.UTC(year, month - 1, 15)))),
    }
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - weekday)
  const monday = date.toISOString().slice(0, 10)
  const end = new Date(date)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  return {
    key: monday,
    label: `Semana del ${fmt.format(date).replace('.', '')} al ${fmt.format(end).replace('.', '')}`,
  }
}

function LearningsView({
  onBack,
  onOpenSituation,
  labelByCode,
  colorByCode,
  scopeLabel,
}: AdminInsightPanelProps) {
  const { state, retry } = useSituationsByStatus(CLOSED_STATUSES)
  const [grouping, setGrouping] = useState<Grouping>('month')

  const items = state.status === 'ready' ? state.items : NO_SITUATIONS
  const totals = useMemo(() => {
    const onTime = items.filter((s) => s.closedOnTime === true).length
    const withLearning = items.filter((s) => s.resolution?.learning).length
    return { closed: items.length, onTime, withLearning }
  }, [items])

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: SituationResponse[] }>()
    const sorted = [...items].sort(
      (left, right) =>
        new Date(right.closedAt ?? right.updatedAt).getTime() -
        new Date(left.closedAt ?? left.updatedAt).getTime(),
    )
    for (const situation of sorted) {
      const { key, label } = groupKey(
        situation.closedAt ?? situation.updatedAt,
        grouping,
      )
      const group = map.get(key) ?? { label, items: [] }
      group.items.push(situation)
      map.set(key, group)
    }
    return [...map.entries()].map(([key, group]) => ({ key, ...group }))
  }, [items, grouping])

  return (
    <section className="admin-insight" data-view="learnings">
      <InsightHeader
        icon={<IconBook size={22} />}
        eyebrow={scopeLabel ? `Consulta · ${scopeLabel}` : 'Consulta · situaciones cerradas'}
        title="Historial y Aprendizajes"
        subtitle="Cierres agrupados por período, con su cumplimiento de SLA y la lección registrada."
        onBack={onBack}
      />

      {state.status === 'loading' ? <LoadingBlock /> : null}
      {state.status === 'error' ? (
        <ErrorBlock message={state.message} onRetry={retry} />
      ) : null}

      {state.status === 'ready' ? (
        <>
          <div className="admin-insight__metrics admin-insight__metrics--three">
            <Metric value={totals.closed} label="Cerradas" />
            <Metric
              value={percent(totals.onTime, totals.closed)}
              label="Cerradas a tiempo"
              tone="stable"
            />
            <Metric
              value={totals.withLearning}
              label="Con aprendizaje"
              tone="alert"
            />
          </div>

          <Segmented<Grouping>
            label="Agrupar por"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
              { value: 'cycle', label: 'Ciclo' },
            ]}
          />

          {groups.length === 0 ? (
            <EmptyBlock
              title="Aún no hay situaciones cerradas"
              text="Cuando se cierren situaciones, aquí aparecerán agrupadas con su aprendizaje."
            />
          ) : (
            groups.map((group) => {
              const onTime = group.items.filter((s) => s.closedOnTime === true).length
              return (
                <section key={group.key} className="admin-insight__group">
                  <header className="admin-insight__group-head">
                    <h3>{group.label}</h3>
                    <span>
                      {group.items.length}{' '}
                      {group.items.length === 1 ? 'cierre' : 'cierres'} ·{' '}
                      {percent(onTime, group.items.length)} a tiempo
                    </span>
                  </header>
                  <ul className="admin-insight__list">
                    {group.items.map((situation) => (
                      <SituationRow
                        key={situation.id}
                        situation={situation}
                        labelByCode={labelByCode}
                        colorByCode={colorByCode}
                        onOpen={onOpenSituation}
                        meta={
                          <>
                            <span className="admin-insight__row-age">
                              Cerrada el {formatDate(situation.closedAt)}
                            </span>
                            {situation.closedOnTime === true ? (
                              <Pill tone="stable">A tiempo</Pill>
                            ) : situation.closedOnTime === false ? (
                              <Pill tone="critical">Fuera de plazo</Pill>
                            ) : null}
                            <Pill tone={severityTone(situation.severity)}>
                              {SEVERITY_LABEL[situation.severity] ?? situation.severity}
                            </Pill>
                          </>
                        }
                      >
                        {situation.resolution?.learning ? (
                          <span className="admin-insight__learning">
                            «{situation.resolution.learning}»
                            <small>— {situation.resolution.resolvedByUserName}</small>
                          </span>
                        ) : (
                          <span className="admin-insight__learning admin-insight__learning--missing">
                            Aprendizaje no registrado en el cierre.
                          </span>
                        )}
                      </SituationRow>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </>
      ) : null}
    </section>
  )
}

/* ========================================================================== */
/* Acciones administrativas                                                    */
/* ========================================================================== */

const ADMIN_STATUSES = ['OPEN', 'IN_PROGRESS', 'CANCELLED'] as const

function AdminActionsView({
  onBack,
  onOpenSituation,
  labelByCode,
  colorByCode,
}: AdminInsightPanelProps) {
  const { state, retry } = useSituationsByStatus(ADMIN_STATUSES)
  const items = state.status === 'ready' ? state.items : NO_SITUATIONS

  const actionable = useMemo(
    () =>
      items
        .filter(
          (s) =>
            s.status !== 'CANCELLED' && (s.canCancel === true || s.canTransfer === true),
        )
        .sort((left, right) => priorityOf(right) - priorityOf(left)),
    [items],
  )
  const cancelled = useMemo(
    () =>
      items
        .filter((s) => s.status === 'CANCELLED')
        .sort(
          (left, right) =>
            new Date(right.cancellation?.cancelledAt ?? right.updatedAt).getTime() -
            new Date(left.cancellation?.cancelledAt ?? left.updatedAt).getTime(),
        ),
    [items],
  )
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? actionable : actionable.slice(0, 6)

  return (
    <section className="admin-insight" data-view="admin-actions">
      <InsightHeader
        icon={<IconCrown size={22} />}
        eyebrow="Exclusivo del administrador"
        title="Acciones Administrativas"
        subtitle="Herramientas excepcionales sobre la vigencia y la asignación de cada caso."
        onBack={onBack}
      />

      <div className="admin-insight__tools">
        <article className="admin-insight__tool" data-tool="cancel">
          <span className="admin-insight__tool-icon" aria-hidden="true">
            <IconBan size={18} />
          </span>
          <div>
            <h3>Anular situación</h3>
            <p>
              Retira un caso registrado por error o duplicado. Exige un motivo y
              conserva quién lo anuló, cuándo y desde qué estado.
            </p>
          </div>
        </article>
        <article className="admin-insight__tool" data-tool="transfer">
          <span className="admin-insight__tool-icon" aria-hidden="true">
            <IconSwap size={18} />
          </span>
          <div>
            <h3>Trasladar coordinación</h3>
            <p>
              Reasigna la coordinación responsable de una situación activa cuando
              el caso pertenece a otra área.
            </p>
          </div>
        </article>
      </div>

      {state.status === 'loading' ? <LoadingBlock /> : null}
      {state.status === 'error' ? (
        <ErrorBlock message={state.message} onRetry={retry} />
      ) : null}

      {state.status === 'ready' ? (
        <>
          <section className="admin-insight__group">
            <header className="admin-insight__group-head">
              <h3>Situaciones sobre las que puede actuar</h3>
              <span>{actionable.length} habilitadas</span>
            </header>
            {actionable.length === 0 ? (
              <EmptyBlock
                title="Ninguna situación admite acciones ahora"
                text="Las anulaciones y traslados solo aplican a situaciones activas."
              />
            ) : (
              <>
                <ul className="admin-insight__list">
                  {shown.map((situation) => (
                    <SituationRow
                      key={situation.id}
                      situation={situation}
                      labelByCode={labelByCode}
                      colorByCode={colorByCode}
                      onOpen={onOpenSituation}
                      meta={
                        <>
                          {situation.canCancel ? <Pill tone="critical">Anulable</Pill> : null}
                          {situation.canTransfer ? (
                            <Pill tone="admin">Trasladable</Pill>
                          ) : null}
                          <Pill tone={slaTone(situation.slaHealth)}>
                            {situation.slaHealth
                              ? SLA_LABEL[situation.slaHealth]
                              : (STATUS_LABEL[situation.status] ?? situation.status)}
                          </Pill>
                        </>
                      }
                    />
                  ))}
                </ul>
                {actionable.length > shown.length || showAll ? (
                  <button
                    type="button"
                    className="admin-insight__more"
                    onClick={() => setShowAll((value) => !value)}
                  >
                    {showAll
                      ? 'Mostrar menos'
                      : `Ver las ${actionable.length} situaciones habilitadas`}
                  </button>
                ) : null}
              </>
            )}
          </section>

          <section className="admin-insight__group">
            <header className="admin-insight__group-head">
              <h3>Registro de anulaciones</h3>
              <span>{cancelled.length} registradas</span>
            </header>
            {cancelled.length === 0 ? (
              <EmptyBlock
                title="No hay situaciones anuladas"
                text="Cada anulación quedará aquí con su motivo, responsable y fecha."
              />
            ) : (
              <ul className="admin-insight__list">
                {cancelled.map((situation) => (
                  <SituationRow
                    key={situation.id}
                    situation={situation}
                    labelByCode={labelByCode}
                    colorByCode={colorByCode}
                    onOpen={onOpenSituation}
                    meta={
                      <span className="admin-insight__row-age">
                        Anulada el {formatDate(situation.cancellation?.cancelledAt)} por{' '}
                        {situation.cancellation?.cancelledByUserName ?? '—'}
                      </span>
                    }
                  >
                    {situation.cancellation?.reason ? (
                      <span className="admin-insight__learning">
                        Motivo: {situation.cancellation.reason}
                      </span>
                    ) : null}
                  </SituationRow>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  )
}

/* ========================================================================== */
/* Indicadores (KPI)                                                           */
/* ========================================================================== */

/**
 * Indicadores en lenguaje llano para cualquier lector (ver AdminKpiDashboard).
 * Requiere `KPIS_VIEW`; el acceso solo se ofrece si el token lo trae.
 */
function KpiView({ onBack, kpi, labelByCode, colorByCode }: AdminInsightPanelProps) {
  return (
    <section className="admin-insight admin-insight--kpis" data-view="kpis">
      <InsightHeader
        icon={<IconBarChart size={22} />}
        eyebrow="Indicadores · consulta"
        title="Indicadores operacionales"
        subtitle="Cómo está la operación hoy, dónde se concentran los problemas y cómo evolucionan."
        onBack={onBack}
      />
      <AdminKpiDashboard
        selectedCoordinationId={kpi?.selectedCoordination?.id ?? null}
        labelByCode={labelByCode}
        colorByCode={colorByCode}
        onOpenProblem={kpi?.onOpenProblem ?? (() => undefined)}
        onSelectCoordination={kpi?.onSelectCoordination ?? (() => undefined)}
        onAwaitingCardChange={kpi?.onAwaitingCardChange}
      />
    </section>
  )
}
