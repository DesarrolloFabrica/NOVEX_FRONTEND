import { DirectorProblemPanel } from '@/modules/operational-cards/experience/director/DirectorProblemPanel'
import { DirectorReadingPanel } from '@/modules/operational-cards/experience/director/DirectorReadingPanel'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  CircusScene,
  ShellBottom,
  ShellRegion,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import type { DirectorKpiModel } from '@/modules/operational-cards/hooks/useDirectorKpi'
import type { OperationalShellModel } from '@/modules/operational-cards/hooks/useOperationalShellModel'

/**
 * DIRECTOR: personaje + problemas + carril de lectura + baraja reducida.
 * El carril derecho cruza las dos filas, como el action de ANALISTA, para
 * devolver a las cartas el ancho original de la mesa.
 */
export function DirectorOperationalLayout({
  model,
  kpi,
}: {
  model: OperationalShellModel
  kpi: DirectorKpiModel
}) {
  const { controller, selectedCoordination, ticketTheme, ticketRegionClass, character } =
    model

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-surface="operational-shell"
      data-shell-layout="director"
      data-shell-experience="director"
      data-ticket-theme={ticketTheme}
      data-selected-coordination={selectedCoordination?.code ?? ''}
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
            region="coordination-problems"
            title="Problemas"
            hint={
              selectedCoordination ? undefined : 'Resumen de Dirección'
            }
            className={`operational-shell__region--coordination-problems${ticketRegionClass}`}
            showTitle={!selectedCoordination && !controller.level2.problemId}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'problems' : undefined}
          >
            <DirectorProblemPanel model={model} direction={kpi.direction} />
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
        region="director-reading"
        title="Lectura"
        className={`operational-shell__action operational-shell__region--director-reading${ticketRegionClass}`}
        showTitle={false}
        ticketTheme={ticketTheme}
        ticketPanel={ticketTheme ? 'action' : undefined}
      >
        <DirectorReadingPanel
          selectedCoordination={selectedCoordination}
          directionStatus={kpi.directionStatus}
          direction={kpi.direction}
          directionError={kpi.directionError}
          onRetryDirection={kpi.reloadDirection}
          coordinationStatus={kpi.coordinationStatus}
          coordination={kpi.coordination}
          coordinationError={kpi.coordinationError}
          openProblemId={controller.level2.problemId}
          onOpenProblem={controller.selectProblem}
        />
      </ShellRegion>

      <ShellBottom />
    </div>
  )
}
