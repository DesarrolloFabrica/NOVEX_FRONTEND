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
  /** Reintenta LEVEL 1 para esta misma coordinación. */
  onRetry?: () => void
}

export function CoordinationProblemList({
  coordination,
  identity,
  productLabel,
  level1,
  selectedProblemId,
  onProblemSelect,
  onRetry,
}: CoordinationProblemListProps) {
  const statusLabel = OPERATIONAL_STATUS_LABEL[coordination.status]
  const name = productLabel ?? identity.name

  /*
   * LA CABECERA HABLA DEL ÁREA, NO DE LO QUE ESTE USUARIO ALCANZA A VER.
   *
   * Con lectura completa manda LEVEL 1, que describe la lista que se tiene
   * delante. Con lectura PARCIAL manda LEVEL 0 —el resumen autorizado—, porque
   * presentar «1 problema activo» cuando el área tiene doce y solo uno es tuyo
   * sería convertir un recuento restringido en el total del área.
   */
  const lecturaCompleta = level1.status === 'ready' && level1.scope === 'complete'

  const summary = buildCoordinationSummary({
    activeProblemsCount: lecturaCompleta
      ? level1.problems.length
      : coordination.activeProblemsCount,
    criticalCount: lecturaCompleta
      ? level1.problems.filter((problem) => problem.severity === 'CRITICAL')
          .length
      : coordination.criticalCount,
    affectedCoordinationCount: coordination.affectedCoordinationCount,
  })

  const headingId = `coordination-list-title-${coordination.code}`

  /*
   * PILOTO VISUAL · ticket de Fábrica.
   * Solo cuando esta lista es la de `coord-fabrica-contenidos` (y el shell ya
   * marcó el tema). Reordena la jerarquía tipográfica del encabezado sin
   * tocar la lógica de LEVEL 1 ni los mensajes de vacío / alcance.
   */
  const ticketPilotFabrica = coordination.code === 'coord-fabrica-contenidos'
  const titleText = ticketPilotFabrica
    ? (productLabel ?? 'Fábrica de Contenidos')
    : name

  const bodyContent = (
    <>
      {/*
        Aviso de lectura parcial: va DESPUÉS del encabezado del ticket
        para no competir con el título. Mismo testid que en el shell.
      */}
      {level1.status === 'ready' && level1.scope === 'own-only' ? (
        <p
          className="coordination-panel__scope-note"
          data-testid="coordination-scope-note"
          role="status"
        >
          Solo se muestran los problemas que usted reportó en esta
          coordinación. No es la lista completa del área.
        </p>
      ) : null}

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

      {/*
        ERROR DE CARGA. Lleva su propio reintento: no saber si hay problemas no
        es lo mismo que saber que no los hay, y el usuario debe poder
        distinguirlo y volver a intentarlo sin recargar la pantalla.
      */}
      {level1.status === 'error' && (
        <div
          className="coordination-panel__notice"
          data-testid="coordination-panel-error"
          role="alert"
        >
          <p>No pudimos cargar los problemas de esta coordinación.</p>
          {onRetry && (
            <button
              type="button"
              className="coordination-panel__retry"
              data-testid="coordination-panel-retry"
              onClick={onRetry}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {level1.status === 'ready' &&
        (level1.problems.length === 0 ? (
          /*
           * VACÍO, PERO ¿VACÍO DE QUÉ?
           *
           * Con lectura COMPLETA, cero resultados significa que el área no tiene
           * problemas activos. Con lectura PARCIAL solo significa que no hay
           * ninguno que este usuario pueda ver, y decir «todo bajo control» sería
           * afirmar algo que nadie ha comprobado: el estado del área lo da el
           * resumen autorizado, y puede ser CRÍTICO mientras esta lista está
           * vacía. El alcance lo declara el servidor; aquí solo se obedece.
           */
          level1.scope === 'own-only' ? (
            <p
              className="coordination-panel__empty"
              data-testid="coordination-panel-empty-restricted"
            >
              No hay problemas activos visibles para tu usuario
            </p>
          ) : (
            <p
              className="coordination-panel__empty"
              data-testid="coordination-panel-empty"
            >
              Sin problemas activos
            </p>
          )
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
    </>
  )

  const headerBlock = (
    <header className="coordination-panel__header">
      <div className="coordination-panel__heading">
        {ticketPilotFabrica ? (
          <p className="coordination-panel__eyebrow">
            Problemas de la coordinación
          </p>
        ) : null}
        <h3
          id={headingId}
          className={
            ticketPilotFabrica
              ? 'coordination-panel__name coordination-panel__name--circus'
              : 'coordination-panel__name'
          }
        >
          {titleText}
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
  )

  return (
    <section
      className={[
        'coordination-panel',
        'coordination-panel--region',
        ticketPilotFabrica ? 'coordination-panel--ticket-pilot-fabrica' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="coordination-problem-list"
      data-surface="coordination-problems"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      data-scope={level1.scope}
      data-ticket-pilot={ticketPilotFabrica ? 'fabrica' : undefined}
      style={
        { '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties
      }
      aria-labelledby={headingId}
    >
      {ticketPilotFabrica ? (
        <>
          {/*
            Talón del ticket: título entre adornos + indicador de integridad.
            El cuerpo empieza debajo de la perforación (CSS del piloto).
          */}
          <div className="coordination-panel__stub">{headerBlock}</div>
          <div className="coordination-panel__body">{bodyContent}</div>
        </>
      ) : (
        <>
          {headerBlock}
          {bodyContent}
        </>
      )}
    </section>
  )
}
