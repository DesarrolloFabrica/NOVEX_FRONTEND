import { useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { ActiveCoordinationCard } from '@/modules/operational-cards/components/ActiveCoordinationCard'
import { CoordinationTable } from '@/modules/operational-cards/components/CoordinationTable'
import { CoordinationCarousel } from '@/modules/operational-cards/components/CoordinationCarousel'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { OperationalBreadcrumb } from '@/modules/operational-cards/components/OperationalBreadcrumb'
import { ProblemIsland } from '@/modules/operational-cards/components/ProblemIsland'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { buildAlternatives } from '@/modules/operational-cards/data/carouselLayout'
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
 * Lectura en dos planos: el personaje dice cómo está la Dirección, la baraja
 * dice dónde están los focos. Al seleccionar una coordinación, esa carta pasa
 * al área focal con su cara operativa y las otras catorce se comprimen sin
 * desaparecer.
 *
 * Toda la traducción de interacción a presentación del personaje ocurre aquí:
 * `DirectionCharacter` no conoce coordinaciones ni selección, así que el SVG
 * provisional puede sustituirse por el arte final sin tocar esta lógica.
 */

const SKELETON_SLOTS = 8

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

  /** Nombre de producto por code, para las superficies de primer nivel. */
  const labelsByCode = useMemo(
    () =>
      Object.fromEntries(
        productTable.nodes.map((node) => [
          node.coordination.code,
          { label: node.label, artCode: node.artCode },
        ]),
      ),
    [productTable],
  )

  const nodesByCode = useMemo(
    () =>
      Object.fromEntries(
        productTable.nodes.map((node) => [node.coordination.code, node]),
      ),
    [productTable],
  )

  // Una sola geometría para renderizar y para orientar al personaje: no pueden
  // desincronizarse. La carta activa sale de la mesa.
  //
  // `sortByDisplayOrder: false` porque la mesa de producto ya llega en su
  // orden declarado, y el `displayOrder` de la base de datos no refleja el
  // organigrama.
  const layout = useMemo(
    () =>
      buildTableLayout(topLevelRows, {
        excludeCode: selectedCoordination?.code ?? null,
        sortByDisplayOrder: false,
      }),
    [topLevelRows, selectedCoordination],
  )

  // La orientación de la carta activa se calcula sobre la mesa COMPLETA,
  // porque en la que excluye la activa ya no está.
  const fullOrientation = useMemo(
    () =>
      buildTableLayout(topLevelRows, { sortByDisplayOrder: false })
        .orientationByCode,
    [topLevelRows],
  )

  const characterPresentation = buildCharacterPresentation({
    directionStatus,
    orientation: selectedCoordination
      ? (fullOrientation[selectedCoordination.code] ?? 'NEUTRAL')
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
            nodesByCode[selectedCoordination.code]?.label ??
            selectedCoordination.name
          }
          summary={summary}
          onBackToDirection={clearCoordination}
        />
      )}

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
          {/* Área focal: la coordinación bajo observación. No es un modal. */}
          <div className="operational-deck__focus">
            <AnimatePresence mode="wait">
              {selectedCoordination && (
                <ActiveCoordinationCard
                  key={selectedCoordination.code}
                  coordination={selectedCoordination}
                  identity={resolveCoordinationVisualIdentity(
                    selectedCoordination,
                  )}
                  productLabel={nodesByCode[selectedCoordination.code]?.label}
                  level1={level1}
                  onProblemSelect={selectProblem}
                />
              )}
            </AnimatePresence>
          </div>

          {selectedCoordination ? (
            /* El carrusel ofrece las alternativas de PRIMER NIVEL: los ocho
               mazos restantes, nunca una subordinación. Es la misma regla que
               la mesa —una hija no aparece como par de su padre— y el carrusel
               es otra superficie de primer nivel, así que si listara las quince
               filas técnicas Bellas Artes reaparecería como si fuese un igual.
               La `key` lo remonta al cambiar de nodo para que se recentre. */
            <CoordinationCarousel
              key={selectedCoordination.code}
              alternatives={buildAlternatives(
                topLevelRows,
                selectedCoordination.code,
              )}
              labelsByCode={labelsByCode}
              activeDisplayOrder={selectedCoordination.displayOrder}
              onSelect={selectCoordination}
              onHoverChange={hoverCoordination}
            />
          ) : (
            <CoordinationTable
              layout={layout}
              nodesByCode={nodesByCode}
              hoveredCode={hoveredCoordinationCode}
              onSelect={selectCoordination}
              onHoverChange={hoverCoordination}
            />
          )}

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
