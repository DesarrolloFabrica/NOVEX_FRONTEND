import { DirectorProblemPanel } from '@/modules/operational-cards/experience/director/DirectorProblemPanel'
import { useState } from 'react'
import { AdminKpiDashboard } from '@/modules/operational-cards/components/AdminKpiDashboard'
import { InsightHeader } from '@/modules/operational-cards/components/AdminInsightPanels'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import {
  IconBarChart,
  IconCheckCircle,
  IconInfo,
  IconTarget,
} from '@/modules/operational-cards/components/OperationalIcons'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import {
  CIRCUS_TABLE_GEOMETRY,
  renderCircusDeckRibbon,
} from '@/modules/operational-cards/experience/layouts/circusDeckRibbon'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import type { DirectorKpiModel } from '@/modules/operational-cards/hooks/useDirectorKpi'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

const STATUS_LABEL: Record<string, string> = {
  ESTABLE: 'Operación estable',
  ALERTA: 'Operación en alerta',
  CRITICO: 'Operación crítica',
  DESCONOCIDO: 'Estado sin datos',
}

/**
 * DIRECTOR con la piel «escenario circense» (misma línea que ADMIN y ANALISTA).
 *
 *   ┌ cabecera de rol ────────────────────────────────────────────────┐
 *   │ personaje + resumen │ problemas / visión general │  lectura KPI  │
 *   ├ cinta «Coordinaciones» + mesa ───────────────────┤ (dos filas)   │
 *   └──────────────────────────────────────────────────┴───────────────┘
 *
 * La lectura (Estado · Internos · Dependencias · Aprendizajes) necesita alto
 * para sus gráficas, así que ocupa la columna derecha completa. El Director
 * consulta: no reporta, no avanza, no resuelve.
 */
export function DirectorOperationalLayout({
  model,
  kpi,
}: {
  model: OperationalShellModel
  kpi: DirectorKpiModel
}) {
  const { user } = useAuth()
  const {
    controller,
    selectedCoordination,
    labelByCode,
    colorByCode,
    ticketTheme,
    character,
  } = model
  // Sin carta elegida no había tema de ticket y las regiones caían en la
  // superficie oscura base (texto ilegible). Como el ADMIN: «general».
  const theme = ticketTheme ?? 'general'
  const ticketClass = ' operational-shell__region--ticket-panel'
  // «Por coordinación» sin carta elegida: la mesa lo señala (como en ADMIN).
  const [awaitingCard, setAwaitingCard] = useState(false)

  const activeProblemsCount =
    kpi.direction?.problems.activeCount ??
    controller.overview?.coordinations.reduce(
      (sum, c) => sum + c.activeProblemsCount,
      0,
    ) ??
    0

  const criticalProblemsCount =
    kpi.direction?.problems.severity.critical ??
    controller.overview?.coordinations.reduce(
      (sum, c) => sum + c.criticalCount,
      0,
    ) ??
    0

  const directionStatus =
    kpi.direction?.directionStatus ?? controller.overview?.directionStatus

  const coordinationsInAlert = kpi.direction
    ? kpi.direction.coordinationStatusTotals.critical +
      kpi.direction.coordinationStatusTotals.alert
    : (controller.overview?.coordinations.filter((c) => c.status !== 'ESTABLE')
        .length ?? 0)

  // El resumen habla de la coordinación observada o, sin ella, de la Dirección.
  // Sin dato no se afirma «estable»: se dice que no hay dato.
  const scopeStatus =
    selectedCoordination?.status ?? directionStatus ?? 'DESCONOCIDO'
  const scopeActive =
    selectedCoordination?.activeProblemsCount ?? activeProblemsCount
  const scopeCritical =
    selectedCoordination?.criticalCount ?? criticalProblemsCount

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="deck"
      data-shell-experience="director"
      data-tour="operational-shell"
      data-ticket-theme={theme}
      data-has-coordination={selectedCoordination ? 'true' : 'false'}
      data-selected-coordination={selectedCoordination?.code ?? ''}
      data-kpi-awaiting-card={awaitingCard ? 'true' : undefined}
    >
      <CircusScene />

      <OperationalRoleHeader
        labelByCode={labelByCode}
        experience="director"
        user={user}
        selectedCoordination={selectedCoordination}
        directionStatus={directionStatus}
        activeProblemsCount={activeProblemsCount}
        criticalProblemsCount={criticalProblemsCount}
      />

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          <ShellRegion
            region="character"
            title="Estado del personaje"
            className={`operational-shell__region--character operational-shell__region--admin-left${ticketClass}`}
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="character"
          >
            <div className="admin-left-ticket-wrapper">
              {character}

              <div className="admin-ticket-section">
                <div className="admin-ticket-tab">
                  <span className="admin-ticket-tab__icon" aria-hidden="true">
                    <IconBarChart size={16} />
                  </span>
                  <span className="admin-ticket-tab__title">
                    {selectedCoordination
                      ? 'Resumen del área'
                      : 'Resumen de Dirección'}
                  </span>
                </div>
                <ul className="admin-general-summary">
                  <li
                    className="admin-general-summary__item"
                    data-tone={scopeStatus.toLowerCase()}
                  >
                    <span
                      className="admin-general-summary__icon admin-general-summary__icon--status"
                      aria-hidden="true"
                    >
                      <IconCheckCircle size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {STATUS_LABEL[scopeStatus] ?? scopeStatus}
                    </span>
                  </li>
                  <li className="admin-general-summary__item">
                    <span
                      className="admin-general-summary__icon"
                      aria-hidden="true"
                    >
                      <IconTarget size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {scopeActive} {scopeActive === 1 ? 'situación activa' : 'situaciones activas'}
                    </span>
                  </li>
                  <li className="admin-general-summary__item">
                    <span
                      className="admin-general-summary__icon"
                      aria-hidden="true"
                    >
                      <IconInfo size={17} />
                    </span>
                    <span className="admin-general-summary__text">
                      {scopeCritical > 0
                        ? `${scopeCritical} ${scopeCritical === 1 ? 'crítica' : 'críticas'} en curso`
                        : 'Sin situaciones críticas'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="admin-ticket-section">
                <div className="admin-ticket-tab">
                  <span className="admin-ticket-tab__icon" aria-hidden="true">
                    <IconInfo size={16} />
                  </span>
                  <span className="admin-ticket-tab__title">
                    Requieren atención
                  </span>
                </div>
                <div
                  className="admin-my-reports-stat director-alert-stat"
                  data-alert={coordinationsInAlert > 0 || undefined}
                >
                  <span className="admin-my-reports-stat__count">
                    {coordinationsInAlert}
                  </span>
                  <span className="admin-my-reports-stat__label">
                    {coordinationsInAlert === 1 ? 'Coordinación' : 'Coordinaciones'}
                    {/* Desglose: el título decía «en alerta» y contaba también las críticas. */}
                    {kpi.direction ? (
                      <small className="director-alert-stat__breakdown">
                        {kpi.direction.coordinationStatusTotals.critical}{' '}
                        {kpi.direction.coordinationStatusTotals.critical === 1 ? 'crítica' : 'críticas'}
                        {' · '}
                        {kpi.direction.coordinationStatusTotals.alert} en alerta
                      </small>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
          </ShellRegion>

          <ShellRegion
            region="coordination-problems"
            title="Situaciones"
            className={`operational-shell__region--coordination-problems operational-shell__region--admin-center${ticketClass}`}
            showTitle={false}
            ticketTheme={theme}
            ticketPanel="problems"
            tourId="coordination-problems"
          >
            <div className="coordination-problems-view">
              {selectedCoordination && !controller.level2.problemId ? (
                <div
                  className="coordination-focus-banner"
                  data-testid="coordination-focus-banner"
                >
                  <div className="coordination-focus-banner__left">
                    <span
                      className="coordination-focus-banner__dot"
                      style={{
                        backgroundColor:
                          colorByCode[selectedCoordination.code] || '#f5d485',
                      }}
                      aria-hidden="true"
                    />
                    <div>
                      <span className="coordination-focus-banner__label">
                        Coordinación observada
                      </span>
                      <h3 className="coordination-focus-banner__title">
                        {labelByCode[selectedCoordination.code] ??
                          selectedCoordination.name}
                      </h3>
                    </div>
                  </div>
                  <div className="coordination-focus-banner__right">
                    <span
                      className={`coordination-focus-banner__health coordination-focus-banner__health--${selectedCoordination.status.toLowerCase()}`}
                    >
                      {OPERATIONAL_STATUS_LABEL[selectedCoordination.status] ??
                        selectedCoordination.status}
                    </span>
                  </div>
                </div>
              ) : null}
              <DirectorProblemPanel
                model={model}
                direction={kpi.direction}
                directionLoad={kpi.directionStatus}
                directionError={kpi.directionError}
                onRetryDirection={kpi.reloadDirection}
              />
            </div>
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
        region="director-reading"
        title="Lectura"
        className={`operational-shell__action operational-shell__region--director-reading${ticketClass}`}
        showTitle={false}
        ticketTheme={theme}
        ticketPanel="action"
        tourId="director-reading"
      >
        {/* Mismo tablero de indicadores que el ADMIN (mismos endpoints KPI). */}
        {/* `.action-panel` aporta, como en ADMIN, el margen del marco y el scroll interno. */}
        <div
          className="action-panel"
          data-testid="action-panel"
          data-surface="action-panel"
          data-mode="admin-kpis"
        >
          <section
            className="admin-insight admin-insight--kpis"
            data-view="kpis"
          >
            <InsightHeader
              icon={<IconBarChart size={22} />}
              eyebrow="Indicadores · consulta"
              title="Indicadores operacionales"
              subtitle="Cómo está la operación hoy, dónde se concentran las situaciones y cómo evolucionan."
            />
            <AdminKpiDashboard
              selectedCoordinationId={selectedCoordination?.id ?? null}
              labelByCode={labelByCode}
              colorByCode={colorByCode}
              onOpenProblem={controller.selectProblem}
              onSelectCoordination={(code) =>
                controller.selectCoordination(
                  code as Parameters<typeof controller.selectCoordination>[0],
                )
              }
              onAwaitingCardChange={setAwaitingCard}
              directionSource={{
                direction: kpi.direction,
                error: kpi.directionError,
                reload: kpi.reloadDirection,
              }}
            />
          </section>
        </div>
      </ShellRegion>

      <ShellBottom />
    </div>
  )
}
