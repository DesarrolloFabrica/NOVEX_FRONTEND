import { memo, useCallback, useState, type CSSProperties } from 'react'
import {
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import { useSmartTooltipPlacement } from './useSmartTooltipPlacement'

export type IslandImpactState =
  | 'idle'
  | 'propagating'
  | 'impacted'
  | 'illuminated'

export type IslandNodeRole = 'origin' | 'affected' | 'ambient' | 'predicted'

export type IslandLabelPlacement = 'top' | 'bottom'

export interface IslandNodeProps {
  coordinationId: CoordinationId
  role: IslandNodeRole
  riskLevel?: RiskLevel | null
  visualRisk?: RiskLevel | null
  impactState?: IslandImpactState
  selected?: boolean
  onSelect?: (coordinationId: CoordinationId) => void
  scale?: number
  sceneZoom?: number
  disabled?: boolean
  labelPlacement?: IslandLabelPlacement
  style?: CSSProperties
  className?: string
}

function IslandNodeView({
  coordinationId,
  role,
  riskLevel = null,
  visualRisk = null,
  impactState = 'idle',
  selected = false,
  onSelect,
  scale: _scale = 1,
  sceneZoom = 1,
  disabled = false,
  labelPlacement = 'top',
  style,
  className = '',
}: IslandNodeProps) {
  const coordination = getCoordination(coordinationId)
  const risk = riskLevel ?? 'moderate'
  const tone = visualRisk ?? risk
  const isOrigin = role === 'origin'
  const isAmbient = role === 'ambient'
  const [hovered, setHovered] = useState(false)
  const tooltipActive = hovered || selected
  const { islandRef, tooltipRef, placement, visible } =
    useSmartTooltipPlacement(tooltipActive, sceneZoom)

  const handleSelect = useCallback(() => {
    if (disabled) return
    onSelect?.(coordinationId)
  }, [coordinationId, disabled, onSelect])

  const displayState = isAmbient && impactState === 'idle' ? 'ambient' : impactState

  return (
    <article
      ref={islandRef}
      className={[
        'propagation-island',
        isOrigin ? 'propagation-island--origin' : '',
        isAmbient
          ? 'propagation-island--ambient'
          : isOrigin
            ? ''
            : 'propagation-island--affected',
        `propagation-island--${displayState}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-coordination-id={coordinationId}
      data-role={role}
      data-risk={displayState === 'ambient' ? 'dormant' : tone}
      data-tone={displayState === 'ambient' ? 'low' : tone}
      data-impact-state={displayState}
      data-selected={selected}
      data-disabled={disabled}
      data-label-placement={labelPlacement}
      style={style}
      role="button"
      aria-label={`Enfocar ${coordination.name}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelect()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="propagation-island__body" aria-hidden="true">
        <span className="propagation-island__ground-glow" />
        <span className="propagation-island__platform">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} style={{ '--platform-led': index } as CSSProperties} />
          ))}
        </span>
        <span className="propagation-island__detail-orbit propagation-island__detail-orbit--outer" />
        <span className="propagation-island__detail-orbit propagation-island__detail-orbit--inner" />
        <span className="propagation-island__halo" />
        <span className="propagation-island__ring" />
        <span className="propagation-island__wave" />
        <span className="propagation-island__emitter" />
        <img
          src={coordination.islandAsset}
          alt={coordination.shortName}
          className="propagation-island__image"
          width={640}
          height={640}
          decoding="async"
          draggable={false}
        />
        <span className="propagation-island__emblem-glow" />
      </div>

      <div className="propagation-island__overlays">
        <span className="propagation-island__label">
          <i className="propagation-island__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20V8l8-4v16M12 10h8v10M2 20h20M7 10h2M7 14h2M15 13h2M15 16h2" />
            </svg>
          </i>
          <b>{coordination.shortName}</b>
          {isAmbient ? (
            <small className="propagation-island__sync">
              Sincronizado
              <i aria-hidden="true" />
            </small>
          ) : (
            <small>
              Impacto:{' '}
              <em>
                {tone === 'critical'
                  ? 'Muy alto'
                  : tone === 'moderate'
                    ? 'Medio'
                    : tone === 'high'
                      ? 'Alto'
                      : 'Bajo'}
              </em>
            </small>
          )}
        </span>
        {!isAmbient ? (
          <span className="propagation-island__state" aria-hidden="true">
            {impactState === 'impacted'
              ? 'Impactando'
              : impactState === 'illuminated'
                ? 'Conectada'
                : 'Monitoreando'}
          </span>
        ) : null}
        <span
          ref={tooltipRef}
          className="propagation-island__tooltip"
          data-placement={placement}
          data-visible={visible}
          role="tooltip"
        >
          <b>{coordination.name}</b>
          <small>
            {isOrigin
              ? 'Situación origen'
              : isAmbient
                ? 'Coordinación en red'
                : 'Coordinación afectada'}
          </small>
        </span>
      </div>
    </article>
  )
}

export const IslandNode = memo(IslandNodeView)
