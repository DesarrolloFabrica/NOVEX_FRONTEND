import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AdminInsightPanel,
  InsightHeader,
  type AdminInsightView,
} from '@/modules/operational-cards/components/AdminInsightPanels'
import type { OperationalActionPanelProps } from '@/modules/operational-cards/components/OperationalActionPanel'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import {
  bogotaTodayParts,
  buildCyclePeriod,
} from '@/modules/operational-cards/data/problemHistoryPeriod'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import {
  IconBarChart,
  IconCheckCircle,
  IconChevronRight,
  IconDocument,
  IconInfo,
  IconLayers,
  IconTarget,
} from '@/modules/operational-cards/components/OperationalIcons'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import {
  CIRCUS_TABLE_GEOMETRY,
  renderCircusDeckRibbon,
} from '@/modules/operational-cards/experience/layouts/circusDeckRibbon'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import { ReportSituationModal } from '@/modules/operational-cards/experience/layouts/ReportSituationModal'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { hasPermission } from '@/modules/auth/utils/permissions'
import type { OperationalCenterExperienceId } from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'



/** Vistas del panel derecho del ADMIN: las de consulta + «Mis reportes». */
type AdminPanelView = AdminInsightView | 'my-reports'

/**
 * Composición de baraja: personaje + reportes + problemas + mesa + acción.
 * La usan ANALISTA y ADMIN. DIRECTOR tiene composición ejecutiva propia.
 * este layout no pregunta el rol para ramificar operación.
 */
export function DeckOperationalLayout({
  model,
  experience,
}: {
  model: OperationalShellModel
  experience: OperationalCenterExperienceId
}) {
  const { user } = useAuth()
  const {
    controller,
    selectedCoordination,
    canCreate,
    labelByCode,
    rowLabelByCode,
    colorByCode,
    ticketTheme,
    character,
    actionPanel,
  } = model

  /*
   * VISTAS DE CONSULTA DEL ADMIN en el panel derecho (gestión, aprendizajes y
   * acciones administrativas). Viven aquí y no en el reducer: son lecturas
   * propias del ADMIN que no cambian la selección ni el ciclo del problema.
   * Al abrir un expediente desde una de ellas se recuerda la vista, y «Volver»
   * desde el detalle regresa a la lista en lugar de al menú.
   */
  const [adminView, setAdminView] = useState<AdminPanelView | null>(null)
  const returnViewRef = useRef<AdminPanelView | null>(null)
  // Vista de consulta (sin «Mis reportes», que se pinta aparte).
  const insightView: AdminInsightView | null =
    adminView && adminView !== 'my-reports' ? adminView : null
  const panelMode = controller.panelMode
  // Indicadores «Por coordinación» esperando que se elija una carta: la mesa
  // lo señala con un brillo suave en las cartas.
  const [kpiAwaitingCard, setKpiAwaitingCard] = useState(false)
  const kpiAwaiting = adminView === 'kpis' && kpiAwaitingCard

  useEffect(() => {
    if (panelMode !== 'idle') {
      setAdminView(null)
      return
    }
    if (returnViewRef.current) {
      setAdminView(returnViewRef.current)
      returnViewRef.current = null
    }
  }, [panelMode])

  /*
   * Enlace profundo desde la Consola («Operaciones»): `?vista=gestion` abre la
   * gestión de situaciones en el panel derecho. El parámetro se consume para
   * que recargar o volver no reabra la vista.
   */
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('vista')
  useEffect(() => {
    if (experience !== 'admin' || requestedView !== 'gestion') return
    setAdminView('operations')
    setSearchParams(
      (params) => {
        params.delete('vista')
        return params
      },
      { replace: true },
    )
  }, [experience, requestedView, setSearchParams])

  // Los KPI exigen KPIS_VIEW en el token; sin él, el acceso no se ofrece.
  const canViewKpis = hasPermission(user, 'KPIS_VIEW')

  const openAdminHistory = () => {
    // El historial abre en el ciclo vigente: el mes en curso suele empezar
    // vacío y la consulta parecía rota.
    const { year, monthIndex } = bogotaTodayParts()
    controller.openHistory({ allCoordinations: true })
    controller.setHistoryPeriod(buildCyclePeriod(year, monthIndex < 6 ? 1 : 2))
  }

  /*
   * ADMIN y ANALISTA comparten las vistas de consulta (situaciones,
   * aprendizajes, indicadores): antes el ANALISTA veía esas tarjetas con
   * flecha pero no llevaban a ninguna parte. Las acciones administrativas y
   * el «consultar» como botón principal siguen siendo solo del ADMIN (el
   * ANALISTA registra).
   */
  const hasInsightViews = experience === 'admin' || experience === 'analyst'
  const adminActionPanel = hasInsightViews
    ? cloneElement(actionPanel as ReactElement<OperationalActionPanelProps>, {
        onOpenHistory: openAdminHistory,
        historyScopeLabel: 'todas las coordinaciones',
        onOpenOperations: () => setAdminView('operations'),
        onOpenLearnings: () => setAdminView('learnings'),
        onOpenKpis: canViewKpis ? () => setAdminView('kpis') : undefined,
        ...(experience === 'admin'
          ? {
              onPrimaryConsult: () => setAdminView('operations'),
              onOpenAdminActions: () => setAdminView('admin-actions'),
            }
          : {}),
      })
    : actionPanel

  /*
   * «Registrar situación» se abre en un modal (como en el COORDINADOR): el
   * panel derecho sigue mostrando su menú en reposo detrás.
   */
  const reportOpen = panelMode === 'report'
  const restingActionPanel = reportOpen
    ? cloneElement(adminActionPanel as ReactElement<OperationalActionPanelProps>, {
        mode: 'idle',
      })
    : adminActionPanel
  const reportDestination = selectedCoordination
    ? (labelByCode[selectedCoordination.code] ?? selectedCoordination.name)
    : null

  const activeProblemsCount = selectedCoordination
    ? selectedCoordination.activeProblemsCount
    : (controller.overview?.coordinations.reduce(
        (sum, c) => sum + c.activeProblemsCount,
        0,
      ) ?? 0)

  const criticalProblemsCount = selectedCoordination
    ? selectedCoordination.criticalCount
    : (controller.overview?.coordinations.reduce(
        (sum, c) => sum + c.criticalCount,
        0,
      ) ?? 0)

  // Resumen general (admin): sin coordinación elegida se lee la dirección
  // completa, no se asume «estable».
  const summaryStatus =
    selectedCoordination?.status ??
    controller.overview?.directionStatus ??
    'DESCONOCIDO'
  const summarySubject = selectedCoordination ? 'Coordinación' : 'Dirección'
  const summaryStatusLabel =
    summaryStatus === 'ESTABLE'
      ? `${summarySubject} estable`
      : summaryStatus === 'ALERTA'
        ? `${summarySubject} en alerta`
        : summaryStatus === 'CRITICO'
          ? `${summarySubject} crítica`
          : 'Estado sin datos'

  // Cuando no hay coordinación seleccionada, se usa el tema circense 'general' para mantener
  // la textura de papel crema y marco artesanal sin caer en la caja azul oscura de fallback.
  const effectiveTicketTheme = ticketTheme ?? 'general'
  const effectiveTicketRegionClass = ' operational-shell__region--ticket-panel'

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-tour="operational-shell"
      data-shell-layout="deck"
      data-shell-experience={experience}
      data-has-coordination={selectedCoordination ? 'true' : 'false'}
      data-ticket-theme={effectiveTicketTheme}
      data-admin-view={adminView ?? undefined}
      data-kpi-awaiting-card={kpiAwaiting ? 'true' : undefined}
    >
      <CircusScene />

      <OperationalRoleHeader
        experience={experience}
        user={user}
        selectedCoordination={selectedCoordination}
        directionStatus={controller.overview?.directionStatus}
        activeProblemsCount={activeProblemsCount}
        criticalProblemsCount={criticalProblemsCount}
        onReportSituation={
          canCreate
            ? () => controller.openReportForm('INTERNAL')
            : undefined
        }
        canCreate={canCreate}
      />

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          {/*
            Composición «escenario circense» (ADMIN y ANALISTA): personaje +
            resumen + «Mis reportes» a la izquierda, problemas al centro,
            acciones a la derecha y la mesa a todo el ancho bajo su cinta.
            Cada rol conserva sus propias funciones.
          */}
          <ShellRegion
            region="character"
            title="Estado del personaje"
            className={`operational-shell__region--character operational-shell__region--admin-left${effectiveTicketRegionClass}`}
            showTitle={false}
            ticketTheme={effectiveTicketTheme}
            ticketPanel="character"
          >
            <div className="admin-left-ticket-wrapper">
              {character}

              <div className="admin-ticket-section">
                <div className="admin-ticket-tab">
                  <span className="admin-ticket-tab__icon" aria-hidden="true">
                    <IconBarChart size={16} />
                  </span>
                  <span className="admin-ticket-tab__title">Resumen general</span>
                </div>
                <ul className="admin-general-summary">
                  <li
                    className="admin-general-summary__item"
                    data-tone={summaryStatus.toLowerCase()}
                  >
                    <span className="admin-general-summary__icon admin-general-summary__icon--status" aria-hidden="true">
                      <IconCheckCircle size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {summaryStatusLabel}
                    </span>
                  </li>
                  <li className="admin-general-summary__item">
                    <span className="admin-general-summary__icon" aria-hidden="true">
                      <IconTarget size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {activeProblemsCount} situaciones activas
                    </span>
                  </li>
                  <li className="admin-general-summary__item">
                    <span className="admin-general-summary__icon" aria-hidden="true">
                      <IconInfo size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {criticalProblemsCount > 0
                        ? `${criticalProblemsCount} críticas pendientes`
                        : 'Sin incidentes pendientes'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="admin-ticket-section" data-tour="my-reports">
                <div className="admin-ticket-tab">
                  <span className="admin-ticket-tab__icon" aria-hidden="true">
                    <IconDocument size={16} />
                  </span>
                  <span className="admin-ticket-tab__title">Mis reportes</span>
                </div>
                <button
                  type="button"
                  className="admin-my-reports-stat"
                  onClick={() => setAdminView('my-reports')}
                  aria-label={`Ver mis reportes (${controller.myReports.total} en el período)`}
                  title="Ver mis reportes"
                >
                  <span className="admin-my-reports-stat__count">
                    {controller.myReports.total}
                  </span>
                  <span className="admin-my-reports-stat__label">
                    Reportes en el período
                  </span>
                  <span className="admin-my-reports-stat__chevron" aria-hidden="true">
                    <IconChevronRight size={16} />
                  </span>
                </button>
              </div>
            </div>
          </ShellRegion>

          <ShellRegion
            region="coordination-problems"
            title="Problemas de la coordinación"
            hint={
              selectedCoordination ? undefined : 'Seleccione una coordinación'
            }
            className={`operational-shell__region--coordination-problems operational-shell__region--admin-center${effectiveTicketRegionClass}`}
            showTitle={false}
            ticketTheme={effectiveTicketTheme}
            ticketPanel="problems"
            tourId="coordination-problems"
          >
            {selectedCoordination ? (
              <div className="coordination-problems-view">
                <div className="coordination-focus-banner" data-testid="coordination-focus-banner">
                  <div className="coordination-focus-banner__left">
                    <span
                      className="coordination-focus-banner__dot"
                      style={{ backgroundColor: colorByCode[selectedCoordination.code] || '#f5d485' }}
                      aria-hidden="true"
                    />
                    <div>
                      <span className="coordination-focus-banner__label">Coordinación Activa</span>
                      <h3 className="coordination-focus-banner__title">
                        {labelByCode[selectedCoordination.code] ?? selectedCoordination.name}
                      </h3>
                    </div>
                  </div>
                  <div className="coordination-focus-banner__right">
                    <span
                      className={`coordination-focus-banner__health coordination-focus-banner__health--${selectedCoordination.status.toLowerCase()}`}
                    >
                      {selectedCoordination.status === 'ESTABLE'
                        ? 'Estable'
                        : selectedCoordination.status === 'ALERTA'
                          ? 'Alerta'
                          : 'Crítico'}
                    </span>
                  </div>
                </div>

                <CoordinationProblemList
                  coordination={selectedCoordination}
                  identity={resolveCoordinationVisualIdentity(
                    selectedCoordination,
                  )}
                  productLabel={labelByCode[selectedCoordination.code]}
                  level1={controller.level1}
                  selectedProblemId={controller.selectedProblemId}
                  onProblemSelect={controller.selectProblem}
                  onRetry={controller.retryCoordinationProblems}
                  labelByCode={rowLabelByCode}
                  colorByCode={colorByCode}
                />
              </div>
            ) : (
              <div className="coordination-empty-prompt" data-testid="coordination-empty-prompt">
                <div className="coordination-empty-prompt__icon" aria-hidden="true">
                  <IconLayers size={34} />
                </div>
                <h3 className="coordination-empty-prompt__title">Supervisión General de Coordinaciones</h3>
                <p className="coordination-empty-prompt__text">
                  Seleccione una de las cartas en el escenario inferior para inspeccionar el estado de salud, incidentes activos y dependencias de esa coordinación.
                </p>
              </div>
            )}
          </ShellRegion>
        </div>

        <div
          className="operational-shell__stage"
          data-testid="shell-stage"
          data-surface="operational-deck"
          data-tour="operational-deck"
        >
          <OperationalCardExperience
            controller={controller}
            tableGeometry={CIRCUS_TABLE_GEOMETRY}
            deckHeader={renderCircusDeckRibbon}
          />
        </div>
      </div>

      <ShellRegion
        region="action"
        title="Reportar o resolver"
        className={`operational-shell__action${effectiveTicketRegionClass}`}
        showTitle={false}
        ticketTheme={effectiveTicketTheme}
        ticketPanel="action"
        tourId="action-panel"
      >
        {adminView === 'my-reports' ? (
          <div
            className="action-panel"
            data-testid="action-panel"
            data-surface="action-panel"
            data-mode="admin-my-reports"
          >
            <section className="admin-insight admin-insight--my-reports" data-view="my-reports">
              <InsightHeader
                icon={<IconDocument size={22} />}
                eyebrow="Mis reportes · consulta"
                title="Mis reportes"
                subtitle="Lo que has reportado en cualquier coordinación, con su estado actual."
                onBack={() => setAdminView(null)}
              />
              <MyReportsPanel
                myReports={controller.myReports}
                selectedProblemId={controller.selectedProblemId}
                onSelect={(problemId, coordinationCode) => {
                  // «Volver» desde el expediente regresa a esta lista.
                  returnViewRef.current = 'my-reports'
                  setAdminView(null)
                  controller.openMyReport(
                    problemId,
                    coordinationCode as CoordinationId | null,
                  )
                }}
                onLoadMore={controller.loadMoreMyReports}
                labelByCode={rowLabelByCode}
                colorByCode={colorByCode}
              />
            </section>
          </div>
        ) : hasInsightViews && insightView ? (
          <div
            className="action-panel"
            data-testid="action-panel"
            data-surface="action-panel"
            data-mode={`admin-${insightView}`}
          >
            <AdminInsightPanel
              view={insightView}
              onBack={() => setAdminView(null)}
              onOpenSituation={(situation) => {
                returnViewRef.current = adminView
                setAdminView(null)
                controller.openMyReport(
                  situation.id,
                  (situation.coordinationCode as CoordinationId | null) ?? null,
                )
              }}
              labelByCode={rowLabelByCode}
              colorByCode={colorByCode}
              kpi={{
                selectedCoordination,
                selectedLabel: selectedCoordination
                  ? (labelByCode[selectedCoordination.code] ??
                    selectedCoordination.name)
                  : null,
                openProblemId: controller.level2.problemId,
                onOpenProblem: (problemId) => {
                  returnViewRef.current = 'kpis'
                  setAdminView(null)
                  controller.selectProblem(problemId)
                },
                onSelectCoordination: (code) =>
                  controller.selectCoordination(code as CoordinationId),
                onAwaitingCardChange: setKpiAwaitingCard,
              }}
            />
          </div>
        ) : (
          restingActionPanel
        )}
      </ShellRegion>

      {reportOpen ? (
        <ReportSituationModal
          destination={reportDestination}
          onClose={() => controller.closeReportForm()}
        >
          {adminActionPanel}
        </ReportSituationModal>
      ) : null}

      <ShellBottom />
    </div>
  )
}
