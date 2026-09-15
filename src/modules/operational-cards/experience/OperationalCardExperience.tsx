import { useMemo } from 'react'
import { CoordinationTable } from '@/modules/operational-cards/components/CoordinationTable'
import { OperationalBreadcrumb } from '@/modules/operational-cards/components/OperationalBreadcrumb'
import { TableReturnAction } from '@/modules/operational-cards/components/TableReturnAction'
import { resolveDeckSelectionContext } from '@/modules/operational-cards/data/deckContext'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import type { OperationalCardsController } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import '@/styles/operational-cards.css'

/**
 * Orquestador de la experiencia ADMIN de estado operacional.
 *
 * Dice DÓNDE están los focos. Quién es la Dirección y cómo está lo dice el
 * personaje, que vive en su región del shell y no aquí dentro.
 *
 * UNA SOLA ESCENA. Seleccionar una coordinación no cambia de pantalla: la carta
 * se queda en su sitio de la mesa y se destaca ahí; su LEVEL 1 se lee en la
 * región permanente de problemas, arriba. Las otras ocho no se van a ningún
 * carrusel; siguen dibujadas y clickeables, lo que convierte el cambio de
 * coordinación en un clic directo sobre la vecina.
 */

const SKELETON_SLOTS = 8

export interface OperationalCardExperienceProps {
  /**
   * Estado de la escena, creado UNA sola vez por quien compone la pantalla.
   *
   * La experiencia dejó de llamar al hook cuando el personaje se mudó a su
   * región del shell: si cada uno llamara al suyo habría dos reducers, dos
   * peticiones de LEVEL 0 y dos verdades sobre qué está seleccionado. Se crea
   * arriba, donde viven las dos piezas, y baja como dato.
   */
  controller: OperationalCardsController
}

export function OperationalCardExperience({
  controller,
}: OperationalCardExperienceProps) {
  const {
    level0,
    overview,
    errorMessage,
    selectedCoordinationCode,
    hoveredCoordinationCode,
    selectCoordination,
    clearCoordination,
    hoverCoordination,
  } = controller

  // Un fallo de red, HTTP, parseo o contrato se comunica como DESCONOCIDO.
  // Nunca como ESTABLE, y nunca fabricando cartas ni totales en cero.
  const directionStatus: OperationalIntegrityStatus =
    level0 === 'ready' && overview ? overview.directionStatus : 'DESCONOCIDO'

  const selectedCoordination = useMemo(
    () =>
      overview?.coordinations.find(
        (coordination) => coordination.code === selectedCoordinationCode,
      ) ?? null,
    [overview, selectedCoordinationCode],
  )

  /**
   * Proyección de las filas técnicas sobre la ESTRUCTURA DE PRODUCTO: quince
   * coordinaciones en la base de datos, nueve mazos en la mesa. Las cinco
   * subordinaciones de Operación Académica dejan de ser nodos principales y
   * pasan a vivir dentro de su padre; `coord-servicios` no se pinta y sus
   * problemas siguen existiendo técnicamente.
   */
  const productTable = useMemo(
    () => buildProductTable(overview?.coordinations ?? []),
    [overview],
  )

  /** Las filas técnicas que SÍ tienen carta: solo los nodos principales. */
  const topLevelRows = useMemo(
    () => productTable.nodes.map((node) => node.coordination),
    [productTable],
  )

  const nodesByCode = useMemo(
    () =>
      Object.fromEntries(
        productTable.nodes.map((node) => [node.coordination.code, node]),
      ),
    [productTable],
  )

  /**
   * Cómo se llama cada coordinación en la mesa, incluidas las subordinaciones.
   *
   * Existe porque el nombre de producto y el nombre técnico no siempre
   * coinciden, y quien lea la miga o el panel debe ver el primero: la carta
   * «Servicio» no puede abrir un panel que diga «Homologaciones», y la hija
   * «Ingenierías» no debe presentarse como «Coordinador Ingenierías», que es el
   * cargo y no la coordinación.
   */
  const labelByCode = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const node of productTable.nodes) {
      labels[node.coordination.code] = node.label
      for (const child of node.children) labels[child.code] = child.label
    }
    return labels
  }, [productTable])

  /**
   * Una sola geometría, para renderizar y para orientar al personaje: no pueden
   * desincronizarse.
   *
   * Ya no depende de la selección. Antes se recalculaba excluyendo la carta
   * activa, porque esa carta se iba al área focal y la mesa se recomponía con
   * ocho; ahora la mesa tiene siempre los nueve nodos en el mismo sitio, así
   * que el layout es el mismo esté quien esté seleccionado. Es la forma
   * estructural de la memoria espacial: no hay una segunda geometría que pueda
   * discrepar de la primera.
   *
   * `sortByDisplayOrder: false` porque la mesa de producto ya llega en su orden
   * declarado, y el `displayOrder` de la base de datos no refleja el organigrama.
   */
  const layout = useMemo(
    () => buildTableLayout(topLevelRows, { sortByDisplayOrder: false }),
    [topLevelRows],
  )

  /**
   * QUÉ ESTÁ COMPUESTO sobre la mesa: la mesa entera, una coordinación simple
   * observada o un mazo observado.
   *
   * Se DERIVA de la selección que ya existe y de la estructura de producto que
   * ya existe; no se guarda en el reducer. Un modo persistido sería una segunda
   * fuente de verdad capaz de contradecir a la selección, que es el fallo
   * clásico de este tipo de estado.
   *
   * Se resuelve de una vez con el resto del contexto —qué mazo está abierto y
   * si lo observado es el padre o una de sus hijas—, en una sola llamada: son
   * respuestas a la misma pregunta y calcularlas por separado las dejaría
   * discrepar.
   */
  const selectionContext = useMemo(
    () =>
      resolveDeckSelectionContext({
        selectedCode: selectedCoordinationCode,
        nodesByCode,
      }),
    [selectedCoordinationCode, nodesByCode],
  )
  const compositionMode = selectionContext.mode

  /*
   * Aquí se resolvía el ANCLAJE del panel a su carta. Con la lectura de
   * problemas en su región del shell, el panel dejó de existir y con él la
   * pregunta: ninguna pieza de esta escena cuelga ya de la x de un slot.
   * `resolvePanelAnchor` sigue en el repositorio, sin consumidores.
   */

  return (
    <section
      className="operational-deck"
      data-testid="operational-cards-experience"
      data-level0={level0}
      data-status={directionStatus}
      data-selected={selectedCoordination?.code ?? ''}
      /* Composición vigente. Es la lectura semántica de la escena: quien
         inspecciona el DOM —o una prueba— sabe si hay mesa, coordinación
         simple o mazo sin tener que reconstruirlo desde clases y atributos
         dispersos. */
      data-composition-mode={compositionMode}
      aria-labelledby="operational-cards-title"
    >
      <h1 id="operational-cards-title" className="operational-deck__sr-title">
        Estado operacional de la Dirección de Operaciones
      </h1>

      {selectedCoordination && (
        <OperationalBreadcrumb
          /* La miga usa el nombre de PRODUCTO, no el técnico: si no, pulsar la
             carta «Servicio» abriría una miga que dice «Homologaciones». */
          coordinationName={
            labelByCode[selectedCoordination.code] ??
            selectedCoordination.name
          }
          onBackToDirection={clearCoordination}
        />
      )}

      {/*
        ZONA DE COMPOSICIÓN: personaje, mesa y la acción de retorno.

        Existe para que la escena pueda tener DOS COLUMNAS sin que la mesa ni el
        personaje tengan que saberlo. En estado global es una columna vertical y
        se comporta como se comportaba la sección entera; con una coordinación
        simple observada, esta zona pasa a ser la columna izquierda de una
        rejilla y el carril del panel la derecha.

        El personaje ya no vive aquí: tiene su propia región en el shell, y por
        eso esta zona dejó de repartir alto entre la figura y la mesa. Lo que
        queda suyo es el reparto horizontal de la composición.
      */}
      <div
        className="operational-deck__composition"
        data-testid="operational-composition"
      >
        <div className="operational-deck__stage">
          {/*
            El personaje y la lectura institucional ya NO viven aquí: se mudaron
            a su región del shell, que es donde el wireframe los coloca. Lo que
            queda en esta banda es la mesa y el aviso de que LEVEL 0 falló, que
            habla precisamente de las cartas que no se pudieron dibujar.
          */}
          {level0 === 'error' && (
            <p
              className="operational-deck__notice"
              data-testid="operational-cards-error"
              role="alert"
            >
              No se pudo obtener el estado operacional de la Dirección.{' '}
              {errorMessage}
            </p>
          )}
        </div>

        {(level0 === 'idle' || level0 === 'loading') && (
          <div
            className="operational-deck__skeleton"
            data-testid="operational-cards-loading"
            aria-hidden="true"
          >
            {Array.from({ length: SKELETON_SLOTS }, (_unused, index) => (
              <span key={index} />
            ))}
          </div>
        )}

        {level0 === 'ready' && overview && (
          <>
            {/* La MISMA mesa en los tres modos. No hay una segunda escena: con
                una coordinación observada la mesa se comprime y se recentra en
                su columna, pero conserva su orden, su arco y el slot de cada
                coordinación. */}
            <CoordinationTable
              layout={layout}
              nodesByCode={nodesByCode}
              compositionMode={compositionMode}
              deckParentCode={selectionContext.deckParentCode}
              hoveredCode={hoveredCoordinationCode}
              selectedCode={selectedCoordination?.code ?? null}
              onSelect={selectCoordination}
              onHoverChange={hoverCoordination}
            />

            {/* Retorno narrativo de la composición simple. Un mazo abierto
                tendrá el suyo —«Recoger mazo»—, que es otra acción sobre otra
                composición; hasta entonces esta solo aparece donde ya está
                definida. */}
            {compositionMode === 'SIMPLE_SELECTED' && (
              <TableReturnAction
                label="Volver a la mesa"
                onReturn={clearCoordination}
              />
            )}
          </>
        )}
      </div>

      {level0 === 'ready' && overview && (
        <>
          {/*
            Aquí vivía el CARRIL DEL PANEL. La lectura de problemas se mudó a su
            región permanente del shell, así que la mesa dejó de reservar una
            columna para ella: en composición simple ya no hay segunda columna
            que restar, y en modo mazo no hay banda inferior anclada a la carta.
            Lo que queda en la escena de cartas es la mesa.
          */}

          {/*
            Aquí se montaba la ISLA del problema, una capa con velo sobre la
            escena. El detalle se lee ahora en su región permanente del shell,
            así que pulsar una fila ya no tapa la mesa: la deja donde está.
          */}

          {/* Registro de analista: sin problemas activos no se muestra nada.
              Con problemas, marcador textual PROVISIONAL. No es carta, no
              entra en la baraja y no participa de la selección. */}
          {overview.analystRegistry.activeProblemsCount > 0 && (
            <p
              className="operational-deck__provisional"
              data-testid="analyst-registry-placeholder"
            >
              Registro de analista —{' '}
              {overview.analystRegistry.activeProblemsCount} problemas activos
              (provisional)
            </p>
          )}
        </>
      )}
    </section>
  )
}
