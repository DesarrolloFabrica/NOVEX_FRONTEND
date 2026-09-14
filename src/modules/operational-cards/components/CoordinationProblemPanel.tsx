import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import { buildCoordinationSummary } from '@/modules/operational-cards/services/coordination-problems.service'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { PanelAnchor } from '@/modules/operational-cards/data/panelAnchor'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCardsLevel1State } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * LEVEL 1 de la coordinación seleccionada, anclado a su carta.
 *
 * Sustituye a `ActiveCoordinationCard`, que era la otra mitad de un modo
 * seleccionado con dos escenas: la carta viajaba a un área focal y las demás se
 * refugiaban en un carrusel. Aquí la carta NO viaja: se queda en su sitio de la
 * mesa y este panel aparece debajo, señalándola. La lectura de la lista es la
 * misma —nombre, estado, resumen, filas de problema, carga, vacío y error—,
 * pero deja de ser una carta grande y pasa a ser lo que realmente es: el
 * contenido asociado a una carta que sigue en la mesa.
 *
 * No es un modal. No atrapa el foco, no oscurece la pantalla y las otras ocho
 * coordinaciones siguen visibles y clickeables detrás y alrededor.
 *
 * El estado operacional es el de LEVEL 0 y no se recalcula con los problemas
 * cargados: el backend sigue siendo la autoridad de integridad. Lo que sí sale
 * de LEVEL 1, en cuanto está, es el CONTEO del resumen, para que la cabecera no
 * pueda decir «Todo bajo control» sobre una lista llena.
 */

const SKELETON_ROWS = 3

export interface CoordinationProblemPanelProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  /** Nombre de PRODUCTO. Puede diferir del nombre técnico de la fila. */
  productLabel?: string
  /**
   * Dónde caía el panel respecto a la carta que lo abre.
   *
   * OPCIONAL, y hoy solo decorativo. Desde que el panel vive en su carril, su
   * sitio lo decide la rejilla de la escena y no la carta; el anclaje se sigue
   * calculando para las composiciones que tienen slot en la mesa, pero una
   * coordinación observada puede no tenerlo —una subordinación no es nodo
   * principal— y eso ya no puede impedir que su panel exista. Antes sí: la
   * ausencia de anclaje dejaba a la hija con su LEVEL 1 cargado y sin panel
   * donde leerlo.
   */
  anchor?: PanelAnchor | null
  level1: OperationalCardsLevel1State
  onProblemSelect?: (problemId: string) => void
}

export function CoordinationProblemPanel({
  coordination,
  identity,
  productLabel,
  anchor,
  level1,
  onProblemSelect,
}: CoordinationProblemPanelProps) {
  const reducedMotion = useReducedMotion()
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

  const headingId = `coordination-panel-title-${coordination.code}`

  return (
    /*
     * DOS NODOS, UNA AUTORIDAD DE TRANSFORM CADA UNO.
     *
     * El de fuera coloca: lleva el `translateX` en anchos de carta que alinea el
     * panel con su carta. El de dentro anima: Motion escribe su propio
     * `transform` inline para la entrada, y ese estilo en línea gana siempre a la
     * hoja. Con los dos en el mismo nodo, la animación borraba la posición y el
     * panel aparecía centrado bajo el personaje para las nueve coordinaciones.
     */
    <div
      className="coordination-panel-anchor"
      data-testid="coordination-panel-anchor"
      style={
        {
          '--panel-x': anchor?.x ?? 0,
          '--panel-notch': anchor?.notch ?? 0.5,
        } as CSSProperties
      }
    >
      <motion.section
        className="coordination-panel"
        data-testid="coordination-problem-panel"
        data-code={coordination.code}
        data-status={coordination.status}
        data-level1={level1.status}
        data-side={anchor?.side ?? 'NEUTRAL'}
        data-clamped={anchor?.clamped ? 'true' : 'false'}
        style={
          { '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties
        }
        aria-labelledby={headingId}
        /*
         * Entrada corta y en el eje correcto: el panel llega desde la carta, así
         * que sube unos píxeles en lugar de aparecer de la nada. Sin flip y sin
         * escala —eso era el gesto de la carta activa, y la carta ya no viaja—.
         * Con movimiento reducido se llega al estado final sin recorrido.
         */
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 0.72, 0.18, 1] }
        }
      >
        {/* Pico hacia la carta. Decorativo: la conexión también se afirma en el
            nombre accesible, que repite la coordinación de la que habla. */}
        <span className="coordination-panel__notch" aria-hidden="true" />

        <header className="coordination-panel__header">
          <div className="coordination-panel__heading">
            <h2 id={headingId} className="coordination-panel__name">
              {name}
            </h2>
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
                  onSelect={onProblemSelect}
                />
              ))}
            </div>
          ))}
      </motion.section>
    </div>
  )
}
