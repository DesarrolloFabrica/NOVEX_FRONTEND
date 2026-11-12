import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react'
import { AdminInsightPanel } from '@/modules/operational-cards/components/AdminInsightPanels'
import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { CoordinatorProblemPanel } from '@/modules/operational-cards/components/CoordinatorProblemPanel'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import {
  IconBook,
  IconCheckCircle,
  IconChevronRight,
  IconClipboard,
  IconGear,
  IconInfo,
  IconLayers,
  IconPen,
  IconSearch,
  IconTarget,
} from '@/modules/operational-cards/components/OperationalIcons'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import { ReportSituationModal } from '@/modules/operational-cards/experience/layouts/ReportSituationModal'
import {
  bogotaTodayParts,
  buildCyclePeriod,
} from '@/modules/operational-cards/data/problemHistoryPeriod'
import type { OperationalActionPanelProps } from '@/modules/operational-cards/components/OperationalActionPanel'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'

const STATUS_TEXT: Record<string, string> = {
  ESTABLE: 'Estable',
  ALERTA: 'En alerta',
  CRITICO: 'Crítico',
}

const MAX_LIVES = 10

type ConsultView = 'operations' | 'learnings'

/**
 * Lectura en una frase de lo que el coordinador tiene delante al entrar:
 * qué debe atender y qué lo frena. Usa los conteos oficiales del backend.
 */
function buildGuidance(own: CoordinationOverview): string {
  const active = own.activeProblemsCount
  const critical = own.criticalCount
  const incoming = own.incomingDependencyCount ?? 0
  if (critical > 0) {
    return 'Hay situaciones críticas en curso: atiéndalas primero desde «Por resolver». Registre cualquier novedad desde el panel derecho.'
  }
  if (active > 0) {
    return 'Revise las situaciones por resolver en orden de prioridad y abra cada una para ver su detalle y registrar su avance.'
  }
  if (incoming > 0) {
    return 'No tiene situaciones pendientes. Hay dependencias de otras áreas que afectan su operación: consúltelas en «Afectan mi área».'
  }
  return 'Su coordinación opera con normalidad. Registre cualquier novedad desde el panel derecho.'
}

/**
 * COORDINADOR con la piel «escenario circense» (misma línea que ADMIN,
 * DIRECTOR y ANALISTA), sin baraja: solo opera SU coordinación.
 *
 *   ┌ cabecera de rol ─────────────────────────────────────────────┐
 *   │ titular: coordinación + qué hacer ahora                      │
 *   ├ carta y estado ┬ situaciones (pestañas) ┬ registrar/consultar┤
 *   └────────────────┴────────────────────────┴────────────────────┘
 *
 * El detalle, el formulario y el historial se abren en la columna derecha.
 */
export function CoordinatorOperationalLayout({
  model,
}: {
  model: OperationalShellModel
}) {
  const { user } = useAuth()
  const {
    controller,
    assignedCoordination,
    coordinatorAssignmentError,
    canCreate,
    labelByCode,
    rowLabelByCode,
    colorByCode,
    actionPanel,
  } = model

  /*
   * Consultas del panel derecho: «Gestión de situaciones operativas» e
   * «Historial y aprendizajes», las mismas vistas que ADMIN y ANALISTA (el
   * backend ya limita al COORDINADOR a su coordinación). Al abrir un
   * expediente desde una de ellas se recuerda la vista y «Volver» regresa.
   */
  const [consultView, setConsultView] = useState<ConsultView | null>(null)
  const returnViewRef = useRef<ConsultView | null>(null)
  const panelMode = controller.panelMode
  // «Registrar situación» se abre en un modal: la columna derecha conserva
  // sus dos fichas detrás.
  const reportOpen = panelMode === 'report'
  useEffect(() => {
    if (panelMode !== 'idle' && panelMode !== 'report') {
      setConsultView(null)
      return
    }
    if (panelMode === 'report') return
    if (returnViewRef.current) {
      setConsultView(returnViewRef.current)
      returnViewRef.current = null
    }
  }, [panelMode])

  if (coordinatorAssignmentError) {
    return (
      <div
        className="operational-shell operational-shell--coordinator"
        data-testid="operational-shell"
        data-surface="operational-shell"
        data-shell-layout="coordinator"
        data-shell-experience="coordinator"
        data-assignment="missing"
      >
        <CircusScene />
        <div
          className="operational-shell__assignment-error"
          data-testid="coordinator-assignment-error"
          role="alert"
        >
          <h1>Coordinación no asignada</h1>
          <p>
            Su cuenta de coordinador no tiene una coordinación válida vinculada.
            No se mostrará la mesa completa ni se elegirá un área arbitraria.
            Contacte al administrador para corregir la asignación.
          </p>
        </div>
        <ShellBottom />
      </div>
    )
  }

  const own = assignedCoordination
  const scopedActionPanel = cloneElement(
    actionPanel as ReactElement<OperationalActionPanelProps>,
    { historyScopeLabel: 'mi coordinación' },
  )
  const ownIdentity = own ? resolveCoordinationVisualIdentity(own) : null
  const ownName = own ? (labelByCode[own.code] ?? own.name) : 'Mi coordinación'
  const lives = own?.lifePoints ?? null
  const theme = 'general'

  return (
    <div
      className="operational-shell operational-shell--coordinator-desk"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="deck"
      data-shell-experience="coordinator"
      data-tour="operational-shell"
      data-ticket-theme={theme}
      data-has-coordination="true"
      data-assigned-code={own?.code ?? undefined}
    >
      <CircusScene />

      <OperationalRoleHeader
        experience="coordinator"
        user={user}
        assignedCoordination={own}
        directionStatus={own?.status}
        activeProblemsCount={own?.activeProblemsCount}
        criticalProblemsCount={own?.criticalCount}
        /* Sin «Registrar situación» en la cabecera: la acción vive en su ficha
           del panel derecho y no se duplica arriba. */
        canCreate={canCreate}
      />

      <header
        className="coordinator-intro"
        data-testid="coordinator-intro"
        data-status={own?.status.toLowerCase()}
      >
        <span className="coordinator-intro__medallion" aria-hidden="true">
          <IconLayers size={28} />
        </span>
        <div className="coordinator-intro__text">
          <span className="coordinator-intro__eyebrow">Panel de coordinación</span>
          <div className="coordinator-intro__title-row">
            <h1 className="coordinator-intro__title">{ownName}</h1>
            {own ? (
              <span className="coordinator-intro__status" data-status={own.status.toLowerCase()}>
                <span aria-hidden="true" />
                {STATUS_TEXT[own.status] ?? own.status}
              </span>
            ) : null}
          </div>
          {own ? <p className="coordinator-intro__guidance">{buildGuidance(own)}</p> : null}
        </div>
        {own ? (
          <dl className="coordinator-intro__stats" aria-label="Indicadores de la coordinación">
            <div className="coordinator-intro__stat">
              <dt>Por resolver</dt>
              <dd>{own.activeProblemsCount}</dd>
            </div>
            <div className="coordinator-intro__stat" data-tone={own.criticalCount > 0 ? 'critical' : undefined}>
              <dt>{own.criticalCount === 1 ? 'Crítica' : 'Críticas'}</dt>
              <dd>{own.criticalCount}</dd>
            </div>
            <div className="coordinator-intro__stat" data-tone={(own.incomingDependencyCount ?? 0) > 0 ? 'alert' : undefined}>
              <dt>Afectan mi área</dt>
              <dd>{own.incomingDependencyCount ?? 0}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          <ShellRegion
            region="character"
            title="Mi coordinación"
            className="operational-shell__region--character operational-shell__region--admin-left operational-shell__region--ticket-panel"
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="character"
          >
            <div className="admin-left-ticket-wrapper coordinator-own">
              {own && ownIdentity ? (
                <div
                  className="operational-shell__own-card coordinator-own__card"
                  data-testid="coordinator-own-card"
                  data-region="own-card"
                  data-tour="own-coordination"
                  aria-label="Mi coordinación"
                >
                  <CoordinationCard
                    identity={ownIdentity}
                    status={own.status}
                    productLabel={labelByCode[own.code]}
                    selected
                  />
                </div>
              ) : null}

              {own ? (
                <dl className="coordinator-own__facts" data-tone={own.status.toLowerCase()}>
                  <div className="coordinator-own__fact">
                    <dt>
                      <IconCheckCircle size={15} aria-hidden="true" /> Estado actual
                    </dt>
                    <dd>
                      <span className="coordinator-own__status" data-status={own.status.toLowerCase()}>
                        {STATUS_TEXT[own.status] ?? own.status}
                      </span>
                    </dd>
                  </div>
                  {lives !== null ? (
                    <div className="coordinator-own__fact">
                      <dt>
                        <IconInfo size={15} aria-hidden="true" /> Salud del área
                      </dt>
                      <dd>
                        <span className="coordinator-own__health-value">
                          {lives}/{MAX_LIVES}
                        </span>
                      </dd>
                      {/* Barra en su propia fila: no compite por ancho con el valor. */}
                      <span className="coordinator-own__health" aria-hidden="true">
                        <span
                          className="coordinator-own__health-bar"
                          style={{ width: `${(Math.max(0, Math.min(MAX_LIVES, lives)) / MAX_LIVES) * 100}%` }}
                        />
                      </span>
                    </div>
                  ) : null}
                  <div className="coordinator-own__fact">
                    <dt>
                      <IconTarget size={15} aria-hidden="true" /> Activas
                    </dt>
                    <dd>
                      <strong>{own.activeProblemsCount}</strong>
                      {own.criticalCount > 0 ? (
                        <span className="coordinator-own__critical">
                          {own.criticalCount} {own.criticalCount === 1 ? 'crítica' : 'críticas'}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </ShellRegion>

          <ShellRegion
            region="coordination-problems"
            title="Situaciones de mi coordinación"
            className="operational-shell__region--coordination-problems operational-shell__region--admin-center operational-shell__region--ticket-panel"
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="problems"
            tourId="coordination-problems"
          >
            {own && ownIdentity ? (
              <CoordinatorProblemPanel
                coordination={own}
                identity={ownIdentity}
                productLabel={labelByCode[own.code]}
                level1={controller.level1}
                selectedProblemId={controller.selectedProblemId}
                labelByCode={rowLabelByCode}
                colorByCode={colorByCode}
                onProblemSelect={controller.selectProblem}
                onRetry={controller.retryCoordinationProblems}
                myReports={controller.myReports}
                onMyReportSelect={(problemId, coordinationCode) =>
                  controller.openMyReport(
                    problemId,
                    coordinationCode as CoordinationId | null,
                    { keepSelection: true },
                  )
                }
                onLoadMoreMyReports={controller.loadMoreMyReports}
              />
            ) : null}
          </ShellRegion>
        </div>
      </div>

      {(panelMode === 'idle' || reportOpen) && !consultView ? (
        /* En reposo: dos fichas, «Registrar situación» y «Consultar». */
        <div className="coordinator-actions" data-testid="coordinator-actions">
          <ShellRegion
            region="action"
            title="Registrar situación"
            className="coordinator-actions__card coordinator-actions__card--report operational-shell__region--ticket-panel"
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="action"
            tourId="action-panel"
          >
            <div className="coordinator-actions__head">
              <span className="coordinator-actions__icon" aria-hidden="true">
                <IconPen size={22} />
              </span>
              <div>
                <h2 className="coordinator-actions__title">Registrar situación</h2>
                <p className="coordinator-actions__text">
                  Reporte un problema de su coordinación o una dependencia con otra área.
                </p>
              </div>
            </div>
            {canCreate ? (
              <button
                type="button"
                className="coordinator-actions__cta"
                data-testid="report-situation-button"
                data-tour="report-situation"
                data-surface="report-situation"
                onClick={() => controller.openReportForm('INTERNAL')}
              >
                <span aria-hidden="true">+</span>
                Registrar situación
              </button>
            ) : (
              <p className="coordinator-actions__text">
                Su perfil no tiene permiso para registrar situaciones.
              </p>
            )}
            {/* Solo en pantallas altas (CSS): cómo sigue una situación. */}
            <ol className="coordinator-actions__steps" aria-label="Cómo funciona">
              <li>
                <strong>Registre</strong> qué ocurre, su gravedad y desde cuándo.
              </li>
              <li>
                <strong>La coordinación responsable</strong> la atiende y deja constancia.
              </li>
              <li>
                <strong>Siga su avance</strong> en «Mis reportes» hasta el cierre.
              </li>
            </ol>
          </ShellRegion>

          <ShellRegion
            region="consult"
            title="Consultar"
            className="coordinator-actions__card coordinator-actions__card--consult operational-shell__region--ticket-panel"
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="reports"
          >
            <div className="coordinator-actions__head">
              <span className="coordinator-actions__icon" aria-hidden="true">
                <IconSearch size={22} />
              </span>
              <h2 className="coordinator-actions__title">Consultar</h2>
            </div>
            <nav className="coordinator-actions__links" aria-label="Consultar">
              <button
                type="button"
                className="coordinator-actions__link"
                data-testid="history-open-button"
                data-tour="history-open"
                onClick={() => {
                  // Abre en el ciclo vigente: el mes en curso suele estar vacío.
                  const { year, monthIndex } = bogotaTodayParts()
                  controller.openHistory()
                  controller.setHistoryPeriod(buildCyclePeriod(year, monthIndex < 6 ? 1 : 2))
                }}
                title="Problemas ya cerrados, por semana, mes o ciclo"
              >
                <IconClipboard size={22} aria-hidden="true" />
                <span className="coordinator-actions__link-text">
                  <span>Historial de problemas</span>
                  <small>Problemas cerrados por semana, mes o ciclo</small>
                </span>
                <IconChevronRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="coordinator-actions__link"
                data-testid="guidance-operations"
                onClick={() => setConsultView('operations')}
                title="Situaciones activas de su coordinación, por prioridad"
              >
                <IconGear size={22} aria-hidden="true" />
                <span className="coordinator-actions__link-text">
                  <span>Gestión de situaciones operativas</span>
                  <small>Situaciones activas, por prioridad y SLA</small>
                </span>
                <IconChevronRight size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="coordinator-actions__link"
                data-testid="guidance-learnings"
                onClick={() => setConsultView('learnings')}
                title="Cierres por período, con su cumplimiento de SLA y la lección registrada"
              >
                <IconBook size={22} aria-hidden="true" />
                <span className="coordinator-actions__link-text">
                  <span>Historial y aprendizajes</span>
                  <small>Lecciones registradas al cerrar cada caso</small>
                </span>
                <IconChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          </ShellRegion>
        </div>
      ) : (
        <ShellRegion
          region="action"
          title="Registrar o consultar"
          className="operational-shell__action operational-shell__region--ticket-panel"
          showTitle={false}
          ticketTheme={theme}
          ticketPanel="action"
          tourId="action-panel"
        >
          {consultView ? (
            <div
              className="action-panel"
              data-testid="action-panel"
              data-surface="action-panel"
              data-mode={`admin-${consultView}`}
            >
              <AdminInsightPanel
                view={consultView}
                scopeLabel="mi coordinación"
                onBack={() => setConsultView(null)}
                onOpenSituation={(situation) => {
                  returnViewRef.current = consultView
                  setConsultView(null)
                  controller.openMyReport(
                    situation.id,
                    (situation.coordinationCode as CoordinationId | null) ?? null,
                    { keepSelection: true },
                  )
                }}
                labelByCode={rowLabelByCode}
                colorByCode={colorByCode}
              />
            </div>
          ) : (
            scopedActionPanel
          )}
        </ShellRegion>
      )}

      {reportOpen ? (
        <ReportSituationModal
          destination={ownName}
          onClose={() => controller.closeReportForm()}
        >
          {scopedActionPanel}
        </ReportSituationModal>
      ) : null}

      <ShellBottom />
    </div>
  )
}
