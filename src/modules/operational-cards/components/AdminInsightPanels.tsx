import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchSituations } from '@/modules/api/situations.api'
import type { SituationResponse } from '@/modules/situations/types/situation.types'
import { AdminKpiDashboard } from '@/modules/operational-cards/components/AdminKpiDashboard'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import {
  IconBarChart,
  IconChevronLeft,
  IconChevronRight,
  IconCrown,
  IconGear,
} from '@/modules/operational-cards/components/OperationalIcons'

/**
 * Vistas de consulta del ADMIN en el panel derecho.
 *
 * «Gestión de situaciones operativas» y «Acciones administrativas» abren aquí
 * una lectura construida con el MISMO listado de situaciones que usa el resto
 * del Centro (`GET /situations`): no hay datos inventados ni un endpoint nuevo.
 * Los cierres y sus aprendizajes se consultan en «Historial» (ProblemHistoryPanel),
 * filtrado por período en el servidor; la antigua vista «Historial y
 * aprendizajes» lo duplicaba y se retiró.
 */
export type AdminInsightView =
  | 'operations'
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
/**
 * Se recorren TODAS las páginas que anuncia `total`: antes solo se leía la
 * primera (100 por estado) y Gestión y Acciones
 * administrativas se cortaban en silencio, con sus porcentajes calculados
 * sobre esa lista parcial. Tope defensivo (2.000 por estado), como en LEVEL 1.
 */
const MAX_PAGES_PER_STATUS = 20

async function fetchAllSituationsByStatus(status: string): Promise<SituationResponse[]> {
  const first = await fetchSituations({ status, limit: PAGE_LIMIT, page: 1 })
  const pageCount = Math.min(
    Math.ceil((first.total ?? first.items.length) / PAGE_LIMIT),
    MAX_PAGES_PER_STATUS,
  )
  if (pageCount <= 1) return first.items
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_unused, index) =>
      fetchSituations({ status, limit: PAGE_LIMIT, page: index + 2 }),
    ),
  )
  // Un caso que cambia de página entre peticiones no se cuenta dos veces.
  const seen = new Set<string>()
  return [first, ...rest]
    .flatMap((response) => response.items)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

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
    Promise.all(key.split(',').map((status) => fetchAllSituationsByStatus(status)))
      .then((lists) => {
        if (cancelled) return
        setState({ status: 'ready', items: lists.flat() })
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
  OPEN: 'Abierta',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'En atención',
  CLOSED: 'Cerrada',
  CANCELLED: 'Anulada',
}

const SLA_LABEL: Record<string, string> = {
  on_track: 'En plazo',
  at_risk: 'Plazo en riesgo',
  overdue: 'Plazo vencido',
  closed: 'Plazo cerrado',
}

const shortDate = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
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

function coordinationLabel(
  situation: SituationResponse,
  labelByCode: Record<string, string>,
): string {
  const code = situation.coordinationCode ?? ''
  return labelByCode[code] ?? situation.coordinationName ?? 'Sin coordinación'
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
            data-testid="admin-insight-back"
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
        title="Abrir detalle"
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
        title="Gestión de situaciones operativas"
        subtitle="Situaciones activas ordenadas por prioridad: plazo vencido y severidad primero."
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
            <Metric value={counts.overdue} label="Plazo vencido" tone="critical" />
            <Metric value={counts.inProgress} label="En atención" tone="stable" />
          </div>

          <p className="admin-insight__caption">
            {counts.all} {counts.all === 1 ? 'situación activa' : 'situaciones activas'} en{' '}
            {counts.coordinations} {counts.coordinations === 1 ? 'coordinación' : 'coordinaciones'} ·{' '}
            {counts.atRisk} con plazo en riesgo.
          </p>

          <Segmented<OperationsFilter>
            label="Filtrar situaciones"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Todas', count: counts.all },
              { value: 'critical', label: 'Críticas', count: counts.critical },
              { value: 'overdue', label: 'Plazo vencido', count: counts.overdue },
              { value: 'in-progress', label: 'En atención', count: counts.inProgress },
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
        title="Acciones administrativas"
        subtitle="Herramientas excepcionales sobre la vigencia y la asignación de cada situación."
        onBack={onBack}
      />

      {/* Texto informativo, no controles: las acciones viven en el detalle. */}
      <div className="admin-insight__caption">
        <p>Desde el detalle de cada situación activa puede:</p>
        <ul>
          <li>
            <strong>Anularla</strong>, si se registró por error o está duplicada.
            Exige un motivo y conserva quién la anuló, cuándo y desde qué estado.
          </li>
          <li>
            <strong>Trasladarla</strong> a otra coordinación responsable cuando
            corresponde a otra área.
          </li>
        </ul>
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
        subtitle="Cómo está la operación hoy, dónde se concentran las situaciones y cómo evolucionan."
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
