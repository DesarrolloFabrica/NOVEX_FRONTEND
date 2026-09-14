import { useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { CoordinationProblemPanel } from '@/modules/operational-cards/components/CoordinationProblemPanel'
import { CoordinationTable } from '@/modules/operational-cards/components/CoordinationTable'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { OperationalBreadcrumb } from '@/modules/operational-cards/components/OperationalBreadcrumb'
import { ProblemIsland } from '@/modules/operational-cards/components/ProblemIsland'
import { TableReturnAction } from '@/modules/operational-cards/components/TableReturnAction'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { resolveDeckSelectionContext } from '@/modules/operational-cards/data/deckContext'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { resolvePanelAnchor } from '@/modules/operational-cards/data/panelAnchor'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildDirectionSummary } from '@/modules/operational-cards/data/directionSummary'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import '@/styles/operational-cards.css'
import '@/styles/operational-character.css'
import '@/styles/operational-island.css'

/**
 * Orquestador de la experiencia ADMIN de estado operacional.
 *
 * Lectura en dos planos: el personaje dice cómo está la Dirección, la mesa dice
 * dónde están los focos.
 *
 * UNA SOLA ESCENA. Seleccionar una coordinación no cambia de pantalla: la carta
 * se queda en su sitio de la mesa, se destaca ahí, y su LEVEL 1 aparece en un
 * panel anclado debajo. Las otras ocho no se van a ningún carrusel; siguen
 * dibujadas y clickeables, lo que convierte el cambio de coordinación en un
 * clic directo sobre la vecina.
 *
 * Toda la traducción de interacción a presentación del personaje ocurre aquí:
 * `DirectionCharacter` no conoce coordinaciones ni selección, así que el SVG
 * provisional puede sustituirse por el arte final sin tocar esta lógica.
 */

const SKELETON_SLOTS = 8

/**
 * Ancho del panel de LEVEL 1, en anchos de carta.
 *
 * En unidades de carta y no en píxeles porque el panel comparte eje con la
 * mesa: expresado así, se alinea con su carta a cualquier resolución y el
 * recorte contra el borde del escenario se calcula en el mismo sistema que la
 * geometría de las cartas. Dos cartas y pico es lo más ancho que cabe sin que
 * el panel del nodo central llegue a tapar a sus dos vecinas inmediatas.
 */
const PANEL_WIDTH_IN_CARDS = 2.2

export function OperationalCardExperience() {
  const {
    level0,
    overview,
    errorMessage,
    selectedCoordinationCode,
    hoveredCoordinationCode,
    level1,
    selectedProblemId,
    level2,
    selectCoordination,
    clearCoordination,
    hoverCoordination,
    selectProblem,
    closeProblem,
    toggleSection,
  } = useOperationalOverview()

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

  /**
   * Slot de la coordinación observada, si es una de las nueve de la mesa.
   *
   * Una hija observada no tiene slot propio —no es nodo principal— y eso ya no
   * impide nada: el panel vive en su carril y no necesita colgar de ninguna
   * carta.
   */
  const selectedSlot = useMemo(
    () =>
      selectedCoordination
        ? (layout.slots.find(
            (slot) => slot.coordination.code === selectedCoordination.code,
          ) ?? null)
        : null,
    [layout, selectedCoordination],
  )

  const panelAnchor = useMemo(
    () =>
      selectedSlot
        ? resolvePanelAnchor({
            slotX: selectedSlot.x,
            orientation: selectedSlot.orientation,
            stageWidth: layout.stageWidth,
            panelWidth: PANEL_WIDTH_IN_CARDS,
          })
        : null,
    [selectedSlot, layout.stageWidth],
  )

  const characterPresentation = buildCharacterPresentation({
    directionStatus,
    orientation: selectedCoordination
      ? (layout.orientationByCode[selectedCoordination.code] ?? 'NEUTRAL')
      : hoveredCoordinationCode
        ? (layout.orientationByCode[hoveredCoordinationCode] ?? 'NEUTRAL')
        : 'NEUTRAL',
    hovering: Boolean(hoveredCoordinationCode),
    selecting: Boolean(selectedCoordination),
  })

  const summary =
    level0 === 'ready' && overview
      ? buildDirectionSummary(overview.totals)
      : level0 === 'error'
        ? 'Estado no disponible'
        : 'Consultando el estado de las coordinaciones'

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
          summary={summary}
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

        Que el personaje viva DENTRO de esta zona es lo que produce su
        reencuadre: al estrecharse la columna, se recentra sobre las cartas él
        solo, sin transform propio y sin una segunda autoridad de posición que
        pudiera discrepar de la mesa.
      */}
      <div
        className="operational-deck__composition"
        data-testid="operational-composition"
      >
        {/* Stage del personaje. Sin selección, la lectura institucional vive
            junto a él; con selección se muda a la miga, que tiene espacio
            horizontal libre, y devuelve ese alto al carrusel. En todo momento hay
            exactamente un `direction-summary` en el DOM, así que la región
            aria-live nunca se duplica. */}
        <div className="operational-deck__stage">
          <DirectionCharacter presentation={characterPresentation} />

          {!selectedCoordination && (
            /* aria-live para que un cambio de estado global se anuncie. */
            <p
              className="operational-deck__summary"
              data-testid="direction-summary"
              aria-live="polite"
            >
              {summary}
            </p>
          )}

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
          {/* Carril del panel. En estado global no reserva nada; con una
              coordinación simple observada es la COLUMNA DERECHA de la escena y
              deja de colgar de la carta. En modo mazo sigue, por ahora, siendo
              la banda inferior anclada a su carta. */}
          <div
            className="operational-deck__panel-lane"
            data-testid="coordination-panel-lane"
            data-open={selectedCoordination ? 'true' : 'false'}
          >
            <AnimatePresence mode="wait">
              {selectedCoordination && (
                <CoordinationProblemPanel
                  key={selectedCoordination.code}
                  coordination={selectedCoordination}
                  identity={resolveCoordinationVisualIdentity(
                    selectedCoordination,
                  )}
                  productLabel={labelByCode[selectedCoordination.code]}
                  anchor={panelAnchor}
                  level1={level1}
                  onProblemSelect={selectProblem}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Isla de inspección del problema. Una sola a la vez: el reducer
              ignora una segunda selección mientras haya una abierta. */}
          <AnimatePresence>
            {selectedProblemId && (
              <ProblemIsland
                key={selectedProblemId}
                level2={level2}
                onClose={closeProblem}
                onToggleSection={toggleSection}
              />
            )}
          </AnimatePresence>

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
