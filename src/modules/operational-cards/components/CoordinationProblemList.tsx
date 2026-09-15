import type { CSSProperties } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import { buildCoordinationSummary } from '@/modules/operational-cards/services/coordination-problems.service'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCardsLevel1State } from '@/modules/operational-cards/types/operational-cards.state'
// La superficie de la lista vive en la hoja de la baraja, que es donde la
// estrenó el panel: se importa aquí para no depender de que otro componente
// la haya cargado antes.
import '@/styles/operational-cards.css'

/**
 * LEVEL 1 de la coordinación observada: quién es y qué le pasa.
 *
 * Es la mitad FUNCIONAL de `CoordinationProblemPanel`, extraída cuando la
 * lectura de problemas dejó la mesa y pasó a su región permanente del shell. La
 * otra mitad —el nodo posicionador, el `translateX` en anchos de carta, el pico
 * hacia la carta y la entrada animada desde ella— no se extrajo: se retiró. Ese
 * era el trabajo de colgar el panel de una carta concreta, y una región fija no
 * cuelga de nada. Por eso no hay dos lecturas de problemas conviviendo: hay una,
 * y cambió de sitio.
 *
 * NO CARGA NADA. Recibe `level1` ya resuelto por el controlador de la escena,
 * que es quien pide LEVEL 1 la primera vez que se observa una coordinación y
 * quien lo tiene cacheado al volver. Mover la lista de lugar no podía
 * convertirse en una segunda petición.
 *
 * El estado operacional es el de LEVEL 0 y no se recalcula con los problemas
 * cargados: el backend sigue siendo la autoridad de integridad. Lo que sí sale
 * de LEVEL 1, en cuanto está, es el CONTEO del resumen, para que la cabecera no
 * pueda decir «Todo bajo control» sobre una lista llena.
 *
 * Conserva las clases visuales del panel a propósito: esta fase MUEVE la
 * lectura, no la rediseña, y reescribir su superficie habría mezclado dos
 * cambios que deben poder revisarse por separado.
 */

const SKELETON_ROWS = 3

export interface CoordinationProblemListProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  /** Nombre de PRODUCTO. Puede diferir del nombre técnico de la fila. */
  productLabel?: string
  level1: OperationalCardsLevel1State
  /** Qué problema alimenta ahora mismo la región de detalle. */
  selectedProblemId?: string | null
  onProblemSelect?: (problemId: string) => void
}

export function CoordinationProblemList({
  coordination,
  identity,
  productLabel,
  level1,
  selectedProblemId,
  onProblemSelect,
}: CoordinationProblemListProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[coordination.status]
  const name = productLabel ?? identity.name

  const summary = buildCoordinationSummary({
    activeProblemsCount:
      level1.status === 'ready'
        ? level1.problems.length
        : coordination.activeProblemsCount,
    criticalCount:
      level1.status === 'ready'
        ? level1.problems.filter((problem) => problem.severity === 'CRITICAL')
            .length
        : coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
  })

  const headingId = `coordination-list-title-${coordination.code}`

  return (
    <section
      className="coordination-panel coordination-panel--region"
      data-testid="coordination-problem-list"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      style={
        { '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties
      }
      aria-labelledby={headingId}
    >
      <header className="coordination-panel__header">
        <div className="coordination-panel__heading">
          <h3 id={headingId} className="coordination-panel__name">
            {name}
          </h3>
          {summary && (
            <p
              className="coordination-panel__summary"
              data-testid="coordination-panel-summary"
            >
              {summary}
            </p>
          )}
        </div>

        {/* El estado nunca se comunica solo con color: siempre hay texto. */}
        <span
          className="coordination-panel__status"
          data-testid="coordination-panel-status"
        >
          <span className="coordination-panel__status-dot" aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      {level1.status === 'loading' || level1.status === 'idle' ? (
        <div
          className="coordination-panel__skeleton"
          data-testid="coordination-panel-loading"
          aria-hidden="true"
        >
          {Array.from({ length: SKELETON_ROWS }, (_unused, index) => (
            <span key={index} />
          ))}
        </div>
      ) : null}

      {level1.status === 'error' && (
        <p
          className="coordination-panel__notice"
          data-testid="coordination-panel-error"
          role="alert"
        >
          No pudimos cargar los problemas de esta coordinación.
        </p>
      )}

      {level1.status === 'ready' &&
        (level1.problems.length === 0 ? (
          <p
            className="coordination-panel__empty"
            data-testid="coordination-panel-empty"
          >
            Todo bajo control
          </p>
        ) : (
          <div
            className="coordination-panel__problems"
            data-testid="coordination-panel-problems"
            // Contenedor enfocable: la lista tiene scroll propio y debe poder
            // recorrerse con el teclado. No es una trampa de foco: el tabulador
            // entra y sale con normalidad.
            tabIndex={0}
            role="group"
            aria-label={`Problemas activos de ${productLabel ?? identity.shortName}`}
          >
            {level1.problems.map((problem) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                selected={problem.id === selectedProblemId}
                onSelect={onProblemSelect}
              />
            ))}
          </div>
        ))}
    </section>
  )
}
