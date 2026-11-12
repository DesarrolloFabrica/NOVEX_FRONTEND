import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import {
  IconChevronLeft,
  IconChevronRight,
  IconLayers,
} from '@/modules/operational-cards/components/OperationalIcons'
import { classifyCoordinatorProblems } from '@/modules/operational-cards/data/coordinatorProblemGroups'
import {
  buildProblemRowAccessibleName,
  resolveProblemMark,
  type ProblemMark,
} from '@/modules/operational-cards/data/coordinationMark'
import {
  DOSSIER_HISTORY_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
} from '@/modules/operational-cards/data/problemDossier'
import { buildCoordinationSummary } from '@/modules/operational-cards/services/coordination-problems.service'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  MyReportsState,
  OperationalCardsLevel1State,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import '@/styles/operational-cards.css'

const SKELETON_ROWS = 4

/**
 * Filas por página: tantas como quepan en el alto del panel (fila de 64 px +
 * 8 px de separación), entre 3 y 10. La lista llena el panel sin desplazamiento
 * y la paginación hace el resto.
 */
const ROW_PITCH = 72
const MIN_PAGE = 3
const MAX_PAGE = 10

type TabId = 'to-resolve' | 'affecting' | 'my-reports'
type PeriodId = 'all' | '7' | '30' | '90'

const PERIOD_OPTIONS: ReadonlyArray<{ id: PeriodId; label: string }> = [
  { id: 'all', label: 'Todas las fechas' },
  { id: '7', label: 'Últimos 7 días' },
  { id: '30', label: 'Últimos 30 días' },
  { id: '90', label: 'Últimos 90 días' },
]

const EMPTY_COPY: Record<TabId, { heading: string; text: string }> = {
  'to-resolve': {
    heading: 'Operación al día',
    text: 'No hay situaciones asignadas a su coordinación pendientes de resolver.',
  },
  affecting: {
    heading: 'Sin dependencias externas',
    text: 'Ninguna situación de otra coordinación afecta ahora la operación de su área.',
  },
  'my-reports': {
    heading: 'Sin reportes registrados',
    text: 'Las situaciones que usted registre aparecerán aquí con su estado de avance.',
  },
}

const KIND_BADGE: Record<ProblemMark['relation'], string> = {
  internal: 'Interna',
  'affects-us': 'Dependencia',
  'we-resolve': 'Para otra área',
  responsible: 'Dependencia',
  unresolved: 'Dependencia',
}

export interface CoordinatorProblemPanelProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  productLabel?: string
  level1: OperationalCardsLevel1State
  selectedProblemId?: string | null
  /** Etiquetas de producto/área por code para «la otra coordinación». */
  labelByCode: Readonly<Record<string, string>>
  /** Colores de overview por code (franja e insignia de cada fila). */
  colorByCode?: Readonly<Record<string, string>>
  onProblemSelect?: (problemId: string) => void
  onRetry?: () => void
  /** «Mis reportes» como tercera pestaña (opcional). */
  myReports?: MyReportsState
  onMyReportSelect?: (problemId: string, coordinationCode: string | null) => void
  onLoadMoreMyReports?: () => void
}

/** Fila común: problema de la coordinación o reporte propio. */
interface SituationRowModel {
  id: string
  title: string
  severity: SituationSeverity
  status: string
  createdAt: string
  mark: ProblemMark
  onOpen: () => void
  testIds: { row: string; origin: string; severity: string; status: string }
}

function useFittingPageSize() {
  const ref = useRef<HTMLElement | null>(null)
  const [size, setSize] = useState(5)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height
      if (height <= 0) return
      const fit = Math.floor((height + 8) / ROW_PITCH)
      setSize(Math.max(MIN_PAGE, Math.min(MAX_PAGE, fit)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, size }
}

function withinPeriod(iso: string, period: PeriodId, now: number): boolean {
  if (period === 'all') return true
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return true
  return now - time <= Number(period) * 86_400_000
}

/**
 * «SITUACIONES DE MI COORDINACIÓN» (COORDINADOR).
 *
 * Una sola lista con tres pestañas, en lugar de dos columnas con «Expandir»:
 *   · Por resolver     situaciones que su área debe atender.
 *   · Afectan mi área  dependencias de otras coordinaciones que la frenan.
 *   · Mis reportes     lo que este usuario registró, en cualquier área.
 * Filtro por fecha de registro (por defecto, todas: una situación abierta
 * antigua es justo la que no debe quedar oculta) y paginación ajustada al alto.
 *
 * Fase 01B.2 (K-03): el resumen usa SIEMPRE los conteos oficiales del backend
 * (los mismos de la carta y de la integridad), nunca los de la lista, que
 * mezcla poblaciones y puede ser parcial (alcance own-only).
 */
export function CoordinatorProblemPanel({
  coordination,
  identity,
  level1,
  selectedProblemId,
  labelByCode,
  colorByCode,
  onProblemSelect,
  onRetry,
  myReports,
  onMyReportSelect,
  onLoadMoreMyReports,
}: CoordinatorProblemPanelProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[coordination.status]
  const headingId = `coordinator-problems-title-${coordination.code}`

  const groups =
    level1.status === 'ready'
      ? classifyCoordinatorProblems(level1.problems, coordination.code)
      : { toResolve: [], affecting: [] }

  const summary = buildCoordinationSummary({
    activeProblemsCount: coordination.activeProblemsCount,
    criticalCount: coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
    incomingDependencyCount: coordination.incomingDependencyCount ?? 0,
  })

  const [period, setPeriod] = useState<PeriodId>('all')
  const [now] = useState(() => Date.now())

  const toRows = (tab: TabId): SituationRowModel[] => {
    if (tab === 'my-reports') {
      return (myReports?.items ?? []).map((report) => ({
        id: report.id,
        title: report.title,
        severity: report.severity,
        status: report.status,
        createdAt: report.createdAt,
        mark: resolveProblemMark({
          reportKind: report.reportKind,
          coordinationCode: report.coordinationCode,
          affectedCoordinationCode: report.affectedCoordinationCode,
          viewpointCode: null,
          labelByCode,
          coordinationName: report.coordinationName,
          affectedCoordinationName: report.affectedCoordinationName,
        }),
        onOpen: () =>
          onMyReportSelect?.(
            report.id,
            report.reportKind === 'INTER_COORDINATION'
              ? (report.affectedCoordinationCode ?? report.coordinationCode)
              : report.coordinationCode,
          ),
        testIds: {
          row: 'my-report-row',
          origin: 'my-report-origin',
          severity: 'my-report-severity',
          status: 'my-report-status',
        },
      }))
    }
    const list = tab === 'to-resolve' ? groups.toResolve : groups.affecting
    return list.map((problem) => ({
      id: problem.id,
      title: problem.title,
      severity: problem.severity,
      status: problem.status,
      createdAt: problem.createdAt,
      // La marca representa LA OTRA coordinación respecto de la propia; un
      // interno lleva la propia.
      mark: resolveProblemMark({
        reportKind: problem.reportKind,
        coordinationCode: problem.coordinationCode,
        affectedCoordinationCode: problem.affectedCoordinationCode,
        viewpointCode: coordination.code,
        labelByCode,
      }),
      onOpen: () => onProblemSelect?.(problem.id),
      testIds: {
        row: 'problem-row',
        origin: 'problem-row-origin',
        severity: 'problem-row-severity',
        status: 'problem-row-status',
      },
    }))
  }

  const filtered = (tab: TabId) =>
    toRows(tab).filter((row) => withinPeriod(row.createdAt, period, now))

  // Con filtro de fecha, «Mis reportes» necesita la lista completa para contar.
  const reportsTotal =
    period === 'all' ? (myReports?.total ?? 0) : filtered('my-reports').length
  const counts: Record<TabId, number> = {
    'to-resolve': filtered('to-resolve').length,
    affecting: filtered('affecting').length,
    'my-reports': reportsTotal,
  }

  // Abre en la pestaña con trabajo pendiente; el usuario decide después.
  const [tab, setTab] = useState<TabId | null>(null)
  const activeTab: TabId =
    tab ??
    (groups.toResolve.length > 0 || !myReports
      ? 'to-resolve'
      : groups.affecting.length > 0
        ? 'affecting'
        : 'my-reports')
  const [page, setPage] = useState(0)
  const { ref: bodyRef, size: pageSize } = useFittingPageSize()

  const rows = filtered(activeTab)
  const total = counts[activeTab]
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const from = safePage * pageSize
  const visible = rows.slice(from, from + pageSize)

  // «Mis reportes» llega por páginas del servidor: pide más cuando hace falta.
  const reportItems = myReports?.items ?? []
  const needsMoreReports =
    activeTab === 'my-reports' &&
    Boolean(myReports) &&
    !myReports?.loadingMore &&
    reportItems.length < (myReports?.total ?? 0) &&
    (period !== 'all' || reportItems.length < from + pageSize)
  useEffect(() => {
    if (needsMoreReports) onLoadMoreMyReports?.()
  }, [needsMoreReports, onLoadMoreMyReports])

  const selectTab = (next: TabId) => {
    setTab(next)
    setPage(0)
  }

  const tabs: ReadonlyArray<{ id: TabId; label: string; testId: string }> = [
    { id: 'to-resolve', label: 'Por resolver', testId: 'coordinator-to-resolve' },
    { id: 'affecting', label: 'Afectan mi área', testId: 'coordinator-affecting' },
    ...(myReports
      ? [{ id: 'my-reports' as const, label: 'Mis reportes', testId: 'my-reports' }]
      : []),
  ]
  const activeMeta = tabs.find((item) => item.id === activeTab) ?? tabs[0]

  const loading =
    activeTab === 'my-reports'
      ? myReports?.status === 'loading'
      : level1.status === 'loading' || level1.status === 'idle'
  const errorMessage =
    activeTab === 'my-reports'
      ? myReports?.status === 'error'
        ? (myReports.errorMessage ?? 'No pudimos cargar sus reportes.')
        : null
      : level1.status === 'error'
        ? (level1.errorMessage ?? 'No pudimos cargar las situaciones.')
        : null

  return (
    <article
      className="coordination-panel coordination-panel--region coordination-panel--ticket-pilot coordinator-problems coordinator-situations"
      data-testid="coordinator-problem-panel"
      data-surface="coordinator-problems"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      data-tab={activeTab}
      style={{ '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties}
      aria-labelledby={headingId}
    >
      <header className="coordinator-situations__header">
        <span className="coordinator-situations__icon" aria-hidden="true">
          <IconLayers size={22} />
        </span>
        <div className="coordinator-situations__heading">
          <h2 className="coordinator-situations__title" id={headingId}>
            Situaciones de mi coordinación
          </h2>
          <p
            className="coordinator-situations__summary"
            data-testid="coordination-summary"
            data-status={coordination.status}
          >
            {statusLabel}
            {summary ? `. ${summary}` : null}
          </p>
        </div>
        <label className="coordinator-situations__period">
          <span className="coordinator-situations__period-label">Fecha de registro</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as PeriodId)
              setPage(0)
            }}
            data-testid="coordinator-period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div
        className="coordinator-situations__tabs"
        role="tablist"
        aria-label="Tipo de situación"
        data-tour="situation-tabs"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`coordinator-tab-${item.id}`}
            aria-selected={activeTab === item.id}
            aria-controls="coordinator-situations-panel"
            className="coordinator-situations__tab"
            data-testid={`${item.testId}-tab`}
            onClick={() => selectTab(item.id)}
          >
            <span>{item.label}</span>
            <span className="coordinator-situations__tab-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <section
        ref={bodyRef}
        className="coordinator-situations__body"
        id="coordinator-situations-panel"
        role="tabpanel"
        aria-labelledby={`coordinator-tab-${activeTab}`}
        data-testid={activeMeta.testId}
      >
        {loading ? (
          <div
            className="coordination-panel__list"
            data-testid="coordinator-problems-loading"
            aria-busy="true"
          >
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div key={index} className="coordination-panel__skeleton" aria-hidden="true" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="coordinator-situations__error" data-testid="coordinator-problems-error" role="status">
            <p>{errorMessage}</p>
            {activeTab !== 'my-reports' && onRetry ? (
              <button
                type="button"
                className="coordination-panel__retry"
                data-testid="coordinator-problems-retry"
                onClick={onRetry}
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : total === 0 ? (
          <div className="coordinator-situations__empty" data-testid={`${activeMeta.testId}-empty`}>
            <span className="coordinator-situations__empty-icon" aria-hidden="true">
              ✓
            </span>
            <strong>
              {period === 'all' ? EMPTY_COPY[activeTab].heading : 'Sin situaciones en este período'}
            </strong>
            <p>
              {period === 'all'
                ? EMPTY_COPY[activeTab].text
                : 'Amplíe la fecha de registro para ver situaciones anteriores.'}
            </p>
          </div>
        ) : (
          <ul
            className="coordinator-situations__list"
            data-testid={activeTab === 'my-reports' ? 'my-reports-list' : 'coordinator-problems-groups'}
            data-tour="situation-list"
          >
            {visible.map((row) => (
              <li key={row.id}>
                <SituationRow
                  row={row}
                  selected={row.id === selectedProblemId}
                  colorByCode={colorByCode}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {total > 0 && !loading && !errorMessage ? (
        <footer className="coordinator-situations__footer">
          <span className="coordinator-situations__range" aria-live="polite">
            Mostrando {from + 1} – {Math.min(from + pageSize, total)} de {total}{' '}
            {total === 1 ? 'situación' : 'situaciones'}
          </span>
          {pageCount > 1 ? (
            <nav className="coordinator-situations__pager" aria-label="Páginas">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Página anterior"
              >
                <IconChevronLeft size={16} />
              </button>
              {pageNumbers(safePage, pageCount).map((value, index) =>
                value === null ? (
                  <span key={`gap-${index}`} className="coordinator-situations__gap" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPage(value)}
                    aria-current={value === safePage ? 'page' : undefined}
                    aria-label={`Página ${value + 1}`}
                  >
                    {value + 1}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                aria-label="Página siguiente"
              >
                <IconChevronRight size={16} />
              </button>
            </nav>
          ) : null}
        </footer>
      ) : null}
    </article>
  )
}

/**
 * Fila de situación: franja e insignia con el color de la coordinación
 * representada, título, línea de origen y, a la derecha, severidad y estado.
 * El estado nunca se comunica solo con color: siempre lleva texto.
 */
function SituationRow({
  row,
  selected,
  colorByCode,
}: {
  row: SituationRowModel
  selected: boolean
  colorByCode?: Readonly<Record<string, string>>
}) {
  const severityLabel = DOSSIER_SEVERITY_LABEL[row.severity]
  const statusLabel = DOSSIER_HISTORY_STATUS_LABEL[row.status] ?? row.status
  const color = (row.mark.code && colorByCode?.[row.mark.code]) || '#8a602d'
  return (
    <button
      type="button"
      className="situation-row"
      data-testid={row.testIds.row}
      data-problem-id={row.id}
      data-severity={row.severity}
      data-status={row.status}
      data-relation={row.mark.relation}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      aria-label={buildProblemRowAccessibleName({
        title: row.title,
        mark: row.mark,
        severityLabel,
        statusLabel,
      })}
      style={{ '--row-rgb': hexToRgbChannels(color) } as CSSProperties}
      onClick={row.onOpen}
    >
      <span className="situation-row__badge">{KIND_BADGE[row.mark.relation]}</span>
      <span className="situation-row__main">
        <span className="situation-row__title">{row.title}</span>
        <span className="situation-row__origin" data-testid={row.testIds.origin}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2h8.8A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" strokeLinejoin="round" />
          </svg>
          {row.mark.originLine}
        </span>
      </span>
      <span className="situation-row__chips">
        <span className="situation-row__severity" data-severity={row.severity} data-testid={row.testIds.severity}>
          {severityLabel}
        </span>
        <span className="situation-row__status" data-status={row.status} data-testid={row.testIds.status}>
          {statusLabel}
        </span>
      </span>
      <span className="situation-row__chevron" aria-hidden="true">
        <IconChevronRight size={18} />
      </span>
    </button>
  )
}

/** Hasta 5 números visibles, con «…» cuando hay más páginas. */
function pageNumbers(current: number, count: number): Array<number | null> {
  if (count <= 5) return Array.from({ length: count }, (_, index) => index)
  const pages = new Set([0, count - 1, current - 1, current, current + 1])
  const sorted = [...pages].filter((value) => value >= 0 && value < count).sort((a, b) => a - b)
  const out: Array<number | null> = []
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) out.push(null)
    out.push(value)
  })
  return out
}
