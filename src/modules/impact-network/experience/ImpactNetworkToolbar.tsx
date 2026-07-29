import { memo } from 'react'
import type { ImpactNetworkStatus } from '@/modules/impact-network/types/impact-network.types'

export type ImpactNavigationLevel =
  | 'institutional'
  | 'coordination'
  | 'situation'

interface ImpactNetworkToolbarProps {
  status: ImpactNetworkStatus
  loading: boolean
  error: string | null
  navigationLevel: ImpactNavigationLevel
  selectedCoordinationName: string | null
  activeCount: number
  coordinatorMode?: boolean
  onNavigateDirection: () => void
  onNavigateCoordination: () => void
}

const STATUS_LABEL: Record<ImpactNetworkStatus, string> = {
  stable: 'Estable',
  attention: 'Atención',
  critical: 'Crítico',
}

const FLOW_STEPS: Array<{
  id: ImpactNavigationLevel
  number: string
  label: string
}> = [
  { id: 'institutional', number: '01', label: 'Dirección' },
  { id: 'coordination', number: '02', label: 'Coordinación' },
  { id: 'situation', number: '03', label: 'Situación' },
]

function stepState(
  stepId: ImpactNavigationLevel,
  current: ImpactNavigationLevel,
): 'done' | 'current' | 'upcoming' {
  const order: ImpactNavigationLevel[] = [
    'institutional',
    'coordination',
    'situation',
  ]
  const stepIndex = order.indexOf(stepId)
  const currentIndex = order.indexOf(current)
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'upcoming'
}

function ImpactNetworkToolbarView({
  status,
  loading,
  error,
  navigationLevel,
  selectedCoordinationName,
  activeCount,
  coordinatorMode = false,
  onNavigateDirection,
  onNavigateCoordination,
}: ImpactNetworkToolbarProps) {
  const statusTone = error ? 'error' : status
  const statusText = loading
    ? 'Actualizando…'
    : error
      ? 'Sin datos'
      : `${STATUS_LABEL[status]} · ${activeCount} activas`

  return (
    <div
      className="impact-flow-nav"
      data-level={navigationLevel}
      aria-label="Flujo de navegación de la red de impacto"
    >
      <div className="impact-flow-nav__trail">
        <span className="impact-flow-nav__eyebrow">Ruta de navegación</span>
        <ol className="impact-flow-nav__steps" aria-label="Niveles del flujo">
          {FLOW_STEPS.map((step, index) => {
            const state = stepState(step.id, navigationLevel)
            const canJumpToDirection =
              step.id === 'institutional' &&
              navigationLevel !== 'institutional' &&
              !coordinatorMode
            const canJumpToCoordination =
              step.id === 'coordination' &&
              navigationLevel === 'situation' &&
              Boolean(selectedCoordinationName)

            const content = (
              <>
                <b>{step.number}</b>
                <span>{step.label}</span>
              </>
            )

            return (
              <li key={step.id} data-state={state}>
                {index > 0 ? (
                  <span
                    className="impact-flow-nav__connector"
                    data-state={
                      state === 'upcoming' ? 'upcoming' : 'reached'
                    }
                    aria-hidden="true"
                  />
                ) : null}
                {canJumpToDirection ? (
                  <button type="button" onClick={onNavigateDirection}>
                    {content}
                  </button>
                ) : canJumpToCoordination ? (
                  <button type="button" onClick={onNavigateCoordination}>
                    {content}
                  </button>
                ) : (
                  <span aria-current={state === 'current' ? 'step' : undefined}>
                    {content}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="impact-flow-nav__meta">
        <span className="impact-flow-nav__status" data-status={statusTone}>
          <i aria-hidden="true" />
          {statusText}
        </span>
      </div>
    </div>
  )
}

export const ImpactNetworkToolbar = memo(ImpactNetworkToolbarView)
