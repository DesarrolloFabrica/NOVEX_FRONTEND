import type { ProblemResolution } from '@/modules/operational-cards/types/problem-detail.types'
import {
  resolveResolutionCopy,
  type ResolutionReportKind,
} from '@/modules/situations/data/resolutionCopy'

/**
 * REGISTRO DEL CIERRE, en SOLO LECTURA: aprendizaje íntegro, quién cerró y
 * cuándo. Lo comparten el expediente operativo (`ProblemActions`, problema
 * cerrado) y el del Director, que no monta acciones.
 *
 * Sin controles: mostrar el aprendizaje nunca concede editarlo ni cerrar.
 * La fecha visible es la del CIERRE (`closedAt`); `resolvedAt` solo la
 * sustituye si el detalle no trae cierre.
 */

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  })
}

export function ProblemResolutionRecord({
  resolution,
  reportKind,
}: {
  resolution: ProblemResolution | null
  reportKind: ResolutionReportKind | null | undefined
}) {
  const copy = resolveResolutionCopy(reportKind)
  const closedAt = resolution ? (resolution.closedAt ?? resolution.resolvedAt) : null

  return (
    <div className="problem-actions__resolved" data-testid="problem-resolved">
      <h3 className="problem-actions__heading">Problema cerrado</h3>
      {resolution ? (
        <>
          <p className="problem-actions__label" data-testid="problem-resolution-label">
            {copy.resolvedLabel}
          </p>
          <p className="problem-actions__learning" data-testid="problem-learning">
            {resolution.learning}
          </p>
          <p className="problem-actions__byline" data-testid="problem-resolution-byline">
            {resolution.resolvedByUserName || 'Responsable no registrado'}
            {closedAt ? (
              <>
                {' · '}
                <time dateTime={closedAt} data-testid="problem-resolution-closed-at">
                  Cerrado el {formatDay(closedAt)}
                </time>
              </>
            ) : null}
          </p>
        </>
      ) : (
        <p className="problem-actions__note" data-testid="problem-without-learning">
          Este problema se cerró antes de que se registrara el aprendizaje.
        </p>
      )}
    </div>
  )
}
