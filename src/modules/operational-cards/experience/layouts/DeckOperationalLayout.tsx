import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import type { OperationalCenterExperienceId } from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

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
  const {
    controller,
    selectedCoordination,
    labelByCode,
    rowLabelByCode,
    colorByCode,
    ticketTheme,
    ticketRegionClass,
    character,
    actionPanel,
  } = model

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="deck"
      data-shell-experience={experience}
      data-ticket-theme={ticketTheme}
    >
      <CircusScene />

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          <ShellRegion
            region="character"
            title="Estado del personaje"
            className={`operational-shell__region--character${ticketRegionClass}`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'character' : undefined}
          >
            {character}
          </ShellRegion>

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
            className={`operational-shell__region--coordination-problems${ticketRegionClass}`}
            showTitle={!selectedCoordination}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'problems' : undefined}
          >
            {selectedCoordination && (
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
            )}
          </ShellRegion>
        </div>

        <div
          className="operational-shell__stage"
          data-testid="shell-stage"
          data-surface="operational-deck"
        >
          <OperationalCardExperience controller={controller} />
        </div>
      </div>

      <ShellRegion
        region="action"
        title="Reportar o resolver"
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
