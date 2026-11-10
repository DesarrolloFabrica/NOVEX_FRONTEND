import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import {
  AdminInsightPanel,
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
  IconChevronLeft,
  IconChevronRight,
  IconDocument,
  IconInfo,
  IconLayers,
  IconSwap,
  IconTarget,
} from '@/modules/operational-cards/components/OperationalIcons'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import {
  OperationalCardExperience,
  type DeckHeaderContext,
} from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { hasPermission } from '@/modules/auth/utils/permissions'
import type { OperationalCenterExperienceId } from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

/**
 * Mesa del ADMIN: la baraja vive a todo el ancho bajo la cinta, así que se
 * abre más (solape del 12 %: el nombre de cada carta se lee entero), el arco
 * es más plano y el giro más suave. Las cartas siguen superpuestas.
 */
const ADMIN_TABLE_GEOMETRY = {
  overlap: 0.12,
  arcRise: 0.08,
  arcTilt: 4,
} as const

/**
 * Cinta «Coordinaciones» del ADMIN. Con un mazo abierto (p. ej. Operación
 * Académica) ofrece el regreso a la mesa completa y dice dónde está el usuario;
 * las flechas recorren las coordinaciones de la mesa.
 */
function renderAdminDeckRibbon(context: DeckHeaderContext) {
  const { deckOpen, deckLabel, selectedLabel, onBackToAll, onPrevious, onNext } =
    context
  const showBack = deckOpen

  return (
    <div
      className="operational-deck__header-ribbon"
      data-testid="coordinations-deck-ribbon"
      data-deck-open={deckOpen ? 'true' : 'false'}
    >
      <div className="operational-deck__ribbon-pill">
        <span className="operational-deck__ribbon-icon" aria-hidden="true">
          <IconLayers size={22} />
        </span>
        <span className="operational-deck__ribbon-title">Coordinaciones</span>
      </div>

      {showBack ? (
        <nav
          className="operational-deck__ribbon-trail"
          aria-label="Ubicación en la baraja"
        >
          <button
            type="button"
            className="operational-deck__ribbon-back"
            data-testid="deck-ribbon-back"
            onClick={onBackToAll}
          >
            <IconChevronLeft size={16} />
            <span>Todas las coordinaciones</span>
          </button>
          <span className="operational-deck__ribbon-crumb">
            <span className="operational-deck__ribbon-crumb-sep" aria-hidden="true">
              <IconChevronRight size={14} />
            </span>
            <span className="operational-deck__ribbon-crumb-current">
              Mazo {deckLabel ?? selectedLabel ?? ''}
            </span>
          </span>
        </nav>
      ) : (
        <span className="operational-deck__ribbon-desc">
          {selectedLabel
            ? `Observando ${selectedLabel} · use las flechas para recorrer la mesa`
            : 'Accede y gestiona las coordinaciones del sistema'}
        </span>
      )}

      <div className="operational-deck__ribbon-nav">
        <button
          type="button"
          className="operational-deck__ribbon-btn"
          aria-label="Coordinación anterior"
          title="Coordinación anterior"
          onClick={onPrevious}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="operational-deck__ribbon-btn"
          aria-label="Coordinación siguiente"
          title="Coordinación siguiente"
          onClick={onNext}
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

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
    ticketRegionClass,
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
  const [adminView, setAdminView] = useState<AdminInsightView | null>(null)
  const returnViewRef = useRef<AdminInsightView | null>(null)
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

  // Los KPI exigen KPIS_VIEW en el token; sin él, el acceso no se ofrece.
  const canViewKpis = hasPermission(user, 'KPIS_VIEW')

  const openAdminHistory = () => {
    // El historial abre en el ciclo vigente: el mes en curso suele empezar
    // vacío y la consulta parecía rota.
    const { year, monthIndex } = bogotaTodayParts()
    controller.openHistory({ allCoordinations: true })
    controller.setHistoryPeriod(buildCyclePeriod(year, monthIndex < 6 ? 1 : 2))
  }

  const adminActionPanel =
    experience === 'admin'
      ? cloneElement(
          actionPanel as ReactElement<OperationalActionPanelProps>,
          {
            onOpenHistory: openAdminHistory,
            onPrimaryConsult: () => setAdminView('operations'),
            onOpenOperations: () => setAdminView('operations'),
            onOpenLearnings: () => setAdminView('learnings'),
            onOpenAdminActions: () => setAdminView('admin-actions'),
            onOpenKpis: canViewKpis ? () => setAdminView('kpis') : undefined,
          },
        )
      : actionPanel

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
          {experience === 'admin' ? (
            <>
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
                    <div
                      className="admin-my-reports-stat"
                      onClick={() => controller.openReportForm('INTERNAL')}
                      role="button"
                      tabIndex={0}
                      title="Ver o registrar reportes"
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
                    </div>

                    <div style={{ display: 'none' }}>
                      <MyReportsPanel
                        myReports={controller.myReports}
                        selectedProblemId={controller.selectedProblemId}
                        onSelect={(problemId, coordinationCode) =>
                          controller.openMyReport(
                            problemId,
                            coordinationCode as CoordinationId | null,
                          )
                        }
                        onLoadMore={controller.loadMoreMyReports}
                        labelByCode={rowLabelByCode}
                        colorByCode={colorByCode}
                      />
                    </div>
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
                        <button
                          type="button"
                          className="coordination-focus-banner__clear-btn"
                          onClick={() => controller.clearCoordination()}
                          title="Volver a la vista general de todas las coordinaciones"
                        >
                          <IconSwap size={15} />
                          <span>Cambiar coordinación</span>
                        </button>
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
            </>
          ) : (
            <>
              <ShellRegion
                region="character"
                title="Estado del personaje"
                className={`operational-shell__region--character${effectiveTicketRegionClass}`}
                showTitle={false}
                ticketTheme={effectiveTicketTheme}
                ticketPanel="character"
              >
                {character}
              </ShellRegion>

              <ShellRegion
                region="my-reports"
                title="Mis reportes"
                className={`operational-shell__region--my-reports${effectiveTicketRegionClass}`}
                showTitle={false}
                ticketTheme={effectiveTicketTheme}
                ticketPanel="reports"
                tourId="my-reports"
              >
                <MyReportsPanel
                  myReports={controller.myReports}
                  selectedProblemId={controller.selectedProblemId}
                  onSelect={(problemId, coordinationCode) =>
                    controller.openMyReport(
                      problemId,
                      coordinationCode as CoordinationId | null,
                    )
                  }
                  onLoadMore={controller.loadMoreMyReports}
                  labelByCode={rowLabelByCode}
                  colorByCode={colorByCode}
                />
              </ShellRegion>

              <ShellRegion
                region="coordination-problems"
                title="Problemas de la coordinación"
                hint={
                  selectedCoordination ? undefined : 'Seleccione una coordinación'
                }
                className={`operational-shell__region--coordination-problems${effectiveTicketRegionClass}`}
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
                        <button
                          type="button"
                          className="coordination-focus-banner__clear-btn"
                          onClick={() => controller.clearCoordination()}
                          title="Volver a la vista general de todas las coordinaciones"
                        >
                          <IconSwap size={15} />
                          <span>Cambiar coordinación</span>
                        </button>
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
            </>
          )}
        </div>

        <div
          className="operational-shell__stage"
          data-testid="shell-stage"
          data-surface="operational-deck"
          data-tour="operational-deck"
        >
          <OperationalCardExperience
            controller={controller}
            tableGeometry={
              experience === 'admin' ? ADMIN_TABLE_GEOMETRY : undefined
            }
            deckHeader={
              experience === 'admin' ? renderAdminDeckRibbon : undefined
            }
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
        {experience === 'admin' && adminView ? (
          <div
            className="action-panel"
            data-testid="action-panel"
            data-surface="action-panel"
            data-mode={`admin-${adminView}`}
          >
            <AdminInsightPanel
              view={adminView}
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
                onClearCoordination: controller.clearCoordination,
                onSelectCoordination: (code) =>
                  controller.selectCoordination(code as CoordinationId),
                onAwaitingCardChange: setKpiAwaitingCard,
              }}
            />
          </div>
        ) : (
          adminActionPanel
        )}
      </ShellRegion>

      <ShellBottom />
    </div>
  )
}
