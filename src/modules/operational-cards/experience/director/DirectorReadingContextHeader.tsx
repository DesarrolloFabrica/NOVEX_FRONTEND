import { getCoordinationIconAsset } from '@/modules/impact-network/data/coordination-icons.config'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import '@/styles/director-kpi-panel.css'

/**
 * Identidad de lectura: logo + nombre + síntesis de activos.
 * El badge de integridad vive en Estado operativo (con tooltip).
 */
export function DirectorReadingContextHeader({
  selectedCoordination,
  activeCount,
}: {
  selectedCoordination: CoordinationOverview | null
  // Props conservadas por compatibilidad de firma con el shell.
  directionStatus?: unknown
  direction?: unknown
  coordinationStatus?: unknown
  coordination?: unknown
  integrityStatus?: unknown
  statusTitle?: unknown
  activeCount?: number | null
}) {
  const selected = selectedCoordination !== null
  const showActives = typeof activeCount === 'number' && activeCount >= 0

  return (
    <div
      className="director-reading-context"
      data-testid="director-reading-context"
      data-scope={selected ? 'coordination' : 'direction'}
    >
      <div className="director-reading-context__diag">
        <div className="director-reading-context__who">
          {selectedCoordination ? (
            <h2 className="director-reading-context__title">
              <img
                className="director-reading-context__icon"
                src={getCoordinationIconAsset(selectedCoordination.code)}
                alt=""
              />
              <span>{selectedCoordination.shortName}</span>
            </h2>
          ) : (
            <h2 className="director-reading-context__title">
              <span>Dirección de Operaciones</span>
            </h2>
          )}
          {showActives ? (
            <p
              className="director-reading-context__actives"
              data-testid="director-reading-context-actives"
            >
              <strong>{activeCount}</strong>{' '}
              {activeCount === 1 ? 'activo' : 'activos'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
