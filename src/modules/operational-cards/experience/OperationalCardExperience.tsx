import { useMemo } from 'react'
import { AnimatePresence } from 'motion/react'
import { ActiveCoordinationCard } from '@/modules/operational-cards/components/ActiveCoordinationCard'
import { CoordinationCardDeck } from '@/modules/operational-cards/components/CoordinationCardDeck'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { OperationalBreadcrumb } from '@/modules/operational-cards/components/OperationalBreadcrumb'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { buildDeckLayout } from '@/modules/operational-cards/data/deckLayout'
import { buildDirectionSummary } from '@/modules/operational-cards/data/directionSummary'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import '@/styles/operational-cards.css'
import '@/styles/operational-character.css'

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
    selectCoordination,
    clearCoordination,
    hoverCoordination,
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

  // Una sola geometría para renderizar y para orientar al personaje: no pueden
  // desincronizarse. La carta activa sale de las bandas.
  const layout = useMemo(
    () =>
      buildDeckLayout(overview?.coordinations ?? [], {
        excludeCode: selectedCoordination?.code ?? null,
      }),
    [overview, selectedCoordination],
  )

  // La orientación de la carta activa se calcula sobre la baraja completa,
  // porque en la comprimida ya no está.
  const fullOrientation = useMemo(
    () => buildDeckLayout(overview?.coordinations ?? []).orientationByCode,
    [overview],
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
          coordinationName={selectedCoordination.name}
          onBackToDirection={clearCoordination}
        />
      )}

      {/* Stage del personaje: la lectura institucional vive junto a él. */}
      <div className="operational-deck__stage">
        <DirectionCharacter presentation={characterPresentation} />

        {/* aria-live para que un cambio de estado global se anuncie. */}
        <p
          className="operational-deck__summary"
          data-testid="direction-summary"
          aria-live="polite"
        >
          {summary}
        </p>

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
                  level1={level1}
                />
              )}
            </AnimatePresence>
          </div>

          <CoordinationCardDeck
            layout={layout}
            selectedCode={selectedCoordination?.code ?? null}
            compressed={Boolean(selectedCoordination)}
            onSelect={selectCoordination}
            onHoverChange={hoverCoordination}
          />

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
