import { CoordinationCard } from '@/modules/operational-cards/components/CoordinationCard'
import { CoordinatorProblemPanel } from '@/modules/operational-cards/components/CoordinatorProblemPanel'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

/**
 * Composición COORDINADOR: sin baraja, carta propia, panel agrupado.
 * Extraída tal cual de la rama anterior de OperationalShellV2.
 */
export function CoordinatorOperationalLayout({
  model,
}: {
  model: OperationalShellModel
}) {
  const {
    controller,
    assignedCoordination,
    coordinatorAssignmentError,
    labelByCode,
    rowLabelByCode,
    colorByCode,
    ticketTheme,
    ticketRegionClass,
    character,
    actionPanel,
  } = model

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
  const ownIdentity = own ? resolveCoordinationVisualIdentity(own) : null

  return (
    <div
      className="operational-shell operational-shell--coordinator"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="coordinator"
      data-shell-experience="coordinator"
      data-ticket-theme={ticketTheme}
      data-assigned-code={own?.code ?? undefined}
    >
      <CircusScene />

      <div
        className="operational-shell__rail-stack"
        data-testid="shell-region-rail"
      >
        <ShellRegion
          region="character"
          title="Estado del personaje"
          className={`operational-shell__region--character operational-shell__region--coordinator-character${ticketRegionClass}`}
          showTitle={false}
          ticketTheme={ticketTheme}
          ticketPanel={ticketTheme ? 'character' : undefined}
        >
          {character}
        </ShellRegion>

        {own && ownIdentity ? (
          <div
            className="operational-shell__own-card"
            data-testid="coordinator-own-card"
            data-region="own-card"
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
      </div>

      <ShellRegion
        region="my-reports"
        title="Mis reportes"
        className={`operational-shell__region--my-reports${ticketRegionClass}`}
        showTitle={false}
        ticketTheme={ticketTheme}
        ticketPanel={ticketTheme ? 'reports' : undefined}
      >
        <MyReportsPanel
          myReports={controller.myReports}
          selectedProblemId={controller.selectedProblemId}
          onSelect={(problemId, coordinationCode) =>
            controller.openMyReport(
              problemId,
              coordinationCode as CoordinationId | null,
              { keepSelection: true },
            )
          }
          onLoadMore={controller.loadMoreMyReports}
          labelByCode={rowLabelByCode}
          colorByCode={colorByCode}
        />
      </ShellRegion>

      <ShellRegion
        region="coordination-problems"
        title="Problemas de mi coordinación"
        className={`operational-shell__region--coordination-problems${ticketRegionClass}`}
        showTitle={false}
        ticketTheme={ticketTheme}
        ticketPanel={ticketTheme ? 'problems' : undefined}
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
          />
        ) : null}
      </ShellRegion>

      <ShellRegion
        region="action"
        title="Reportar o consultar"
        className={`operational-shell__action${ticketRegionClass}`}
        showTitle={false}
        ticketTheme={ticketTheme}
        ticketPanel={ticketTheme ? 'action' : undefined}
      >
        {actionPanel}
      </ShellRegion>

      <ShellBottom />
    </div>
  )
}
