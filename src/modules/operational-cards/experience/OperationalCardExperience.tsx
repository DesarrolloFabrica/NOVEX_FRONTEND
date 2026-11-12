import { useMemo, type ReactNode } from 'react'
import { CoordinationTable } from '@/modules/operational-cards/components/CoordinationTable'
import { resolveDeckSelectionContext } from '@/modules/operational-cards/data/deckContext'
import {
  buildTableLayout,
  type TableLayoutOptions,
} from '@/modules/operational-cards/data/tableLayout'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import type { OperationalCardsController } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
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
  /**
   * Geometría opcional de la mesa (solape, arco, giro). Sin ella se usa la
   * calibración por defecto. La pasa la composición, no la carta.
   */
  tableGeometry?: Pick<TableLayoutOptions, 'overlap' | 'arcRise' | 'arcTilt'>
  /**
   * Cabecera opcional de la baraja (la cinta «Coordinaciones» del ADMIN).
   * Recibe el contexto de navegación de la mesa para poder ofrecer el regreso
   * a todas las cartas cuando hay un mazo abierto y recorrer las coordinaciones.
   */
  deckHeader?: (context: DeckHeaderContext) => ReactNode
}

export interface DeckHeaderContext {
  /** Hay un mazo con subordinaciones abierto (p. ej. Operación Académica). */
  deckOpen: boolean
  /** Nombre de producto del mazo abierto, si lo hay. */
  deckLabel: string | null
  /** Nombre de producto de la coordinación observada, si la hay. */
  selectedLabel: string | null
  /** Vuelve a la mesa completa con todas las coordinaciones. */
  onBackToAll: () => void
  /** Observa la coordinación anterior / siguiente de la mesa (circular). */
  onPrevious: () => void
  onNext: () => void
}

export function OperationalCardExperience({
  controller,
  tableGeometry,
  deckHeader,
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
  const overlap = tableGeometry?.overlap
  const arcRise = tableGeometry?.arcRise
  const arcTilt = tableGeometry?.arcTilt
  const layout = useMemo(
    () =>
      buildTableLayout(topLevelRows, {
        sortByDisplayOrder: false,
        overlap,
        arcRise,
        arcTilt,
      }),
    [topLevelRows, overlap, arcRise, arcTilt],
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
   * Recorrido de la mesa para la cabecera: la posición actual es el mazo
   * abierto (si se observa una hija, cuenta su padre) o la carta observada.
   */
  const tableCodes = useMemo(
    () => productTable.nodes.map((node) => node.coordination.code),
    [productTable],
  )
  const currentTableCode =
    selectionContext.deckParentCode ?? selectedCoordination?.code ?? null
  const stepTable = (direction: 1 | -1) => {
    if (tableCodes.length === 0) return
    const index = currentTableCode ? tableCodes.indexOf(currentTableCode) : -1
    const nextIndex =
      index < 0
        ? direction === 1
          ? 0
          : tableCodes.length - 1
        : (index + direction + tableCodes.length) % tableCodes.length
    selectCoordination(tableCodes[nextIndex] as CoordinationId)
  }
  const headerContext: DeckHeaderContext = {
    deckOpen: compositionMode === 'DECK_SELECTED',
    deckLabel: selectionContext.deckParentCode
      ? (labelByCode[selectionContext.deckParentCode] ?? null)
      : null,
    selectedLabel: selectedCoordination
      ? (labelByCode[selectedCoordination.code] ?? selectedCoordination.name)
      : null,
    onBackToAll: clearCoordination,
    onPrevious: () => stepTable(-1),
    onNext: () => stepTable(1),
  }

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

      {deckHeader ? deckHeader(headerContext) : null}


      {/*
        ZONA DE COMPOSICIÓN: la mesa (el retorno vive en la miga superior).

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

            {/* Aquí se montaba «Volver a la mesa», un segundo botón de retorno
                bajo las cartas. Hacía lo mismo que la flecha de la miga
                (`clearCoordination`) y robaba alto a la baraja; el regreso es
                ahora solo la flecha, encima de la mesa. */}
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

          {/* Registro de analista: sin situaciones activas no se muestra nada.
              Con situaciones, un marcador textual. No es carta, no entra en
              la baraja y no participa de la selección. */}
          {overview.analystRegistry.activeProblemsCount > 0 && (
            <p
              className="operational-deck__provisional"
              data-testid="analyst-registry-placeholder"
            >
              Registro de analista:{' '}
              {overview.analystRegistry.activeProblemsCount}{' '}
              {overview.analystRegistry.activeProblemsCount === 1
                ? 'situación activa'
                : 'situaciones activas'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
