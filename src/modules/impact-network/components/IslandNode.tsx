import {
  memo,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from 'react'
import {
  getCoordination,
  getIslandPreviewAssetPath,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'
import type { RiskLevel } from '@/modules/operational-events/types/operational-event.types'
import { useSmartTooltipPlacement } from './useSmartTooltipPlacement'

export type IslandImpactState =
  'idle' | 'propagating' | 'impacted' | 'illuminated'

export type IslandNodeRole = 'origin' | 'affected' | 'ambient' | 'predicted'

export type IslandLabelPlacement = 'top' | 'bottom'
export type IslandImageVariant = 'preview' | 'full'

export interface IslandNodeProps {
  coordinationId: CoordinationId
  role: IslandNodeRole
  riskLevel?: RiskLevel | null
  visualRisk?: RiskLevel | null
  /** Situaciones activas de la coordinación (Nivel 01). */
  activeSituationCount?: number
  /** Severidad máxima entre las situaciones activas; null si no hay. */
  statusRisk?: RiskLevel | null
  impactState?: IslandImpactState
  selected?: boolean
  onSelect?: (coordinationId: CoordinationId) => void
  scale?: number
  sceneZoom?: number
  disabled?: boolean
  labelPlacement?: IslandLabelPlacement
  imageVariant?: IslandImageVariant
  style?: CSSProperties
  className?: string
}

const RISK_RANK: Record<RiskLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

export function formatAmbientSituationLabel(activeCount: number): string {
  if (activeCount <= 0) return 'Sin activas'
  if (activeCount === 1) return '1 activa'
  return `${activeCount} activas`
}

export function resolveAmbientStatusTone(
  activeCount: number,
  statusRisk: RiskLevel | null | undefined,
): RiskLevel {
  if (activeCount <= 0) return 'low'
  if (!statusRisk) {
    return activeCount >= 3 ? 'high' : activeCount >= 2 ? 'moderate' : 'low'
  }
  // Volumen alto empuja un escalón si aún no es crítico.
  if (activeCount >= 4 && RISK_RANK[statusRisk] < RISK_RANK.critical) {
    return statusRisk === 'high' ? 'critical' : 'high'
  }
  if (activeCount >= 3 && statusRisk === 'moderate') return 'high'
  return statusRisk
}

function IslandNodeView({
  coordinationId,
  role,
  riskLevel = null,
  visualRisk = null,
  activeSituationCount = 0,
  statusRisk = null,
  impactState = 'idle',
  selected = false,
  onSelect,
  scale: _scale = 1,
  sceneZoom = 1,
  disabled = false,
  labelPlacement = 'top',
  imageVariant = 'full',
  style,
  className = '',
}: IslandNodeProps) {
  const coordination = getCoordination(coordinationId)
  const fullImageAsset = coordination.islandAsset
  const previewImageAsset = getIslandPreviewAssetPath(fullImageAsset)
  const desiredImageAsset =
    imageVariant === 'preview' ? previewImageAsset : fullImageAsset
  const [displayedImageAsset, setDisplayedImageAsset] =
    useState(desiredImageAsset)
  const risk = riskLevel ?? 'moderate'
  const tone = visualRisk ?? risk
  const ambientStatusTone = resolveAmbientStatusTone(
    activeSituationCount,
    statusRisk,
  )
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

  useEffect(() => {
    if (imageVariant === 'preview') {
      setDisplayedImageAsset(previewImageAsset)
      return
    }

    if (displayedImageAsset === fullImageAsset) return
    const image = new Image()
    image.decoding = 'async'
    image.src = fullImageAsset
    const revealFullImage = () => setDisplayedImageAsset(fullImageAsset)
    if (image.complete) {
      revealFullImage()
      return
    }
    image.addEventListener('load', revealFullImage, { once: true })
    return () => image.removeEventListener('load', revealFullImage)
  }, [displayedImageAsset, fullImageAsset, imageVariant, previewImageAsset])

  const displayState =
    isAmbient && impactState === 'idle' ? 'ambient' : impactState

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
      aria-label={
        isAmbient
          ? `Enfocar ${coordination.name}. ${formatAmbientSituationLabel(activeSituationCount)}`
          : `Enfocar ${coordination.name}`
      }
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
            <i
              key={index}
              style={{ '--platform-led': index } as CSSProperties}
            />
          ))}
        </span>
        <span className="propagation-island__detail-orbit propagation-island__detail-orbit--outer" />
        <span className="propagation-island__detail-orbit propagation-island__detail-orbit--inner" />
        <span className="propagation-island__halo" />
        <span className="propagation-island__ring" />
        <span className="propagation-island__wave" />
        <span className="propagation-island__emitter" />
        <img
          src={displayedImageAsset}
          alt={coordination.shortName}
          className="propagation-island__image"
          width={640}
          height={640}
          decoding="async"
          fetchPriority={imageVariant === 'full' ? 'high' : 'auto'}
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
            <small
              className="propagation-island__sync"
              data-status={ambientStatusTone}
            >
              {formatAmbientSituationLabel(activeSituationCount)}
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
                ? activeSituationCount > 0
                  ? `${formatAmbientSituationLabel(activeSituationCount)} · monitoreo`
                  : 'Sin situaciones activas'
                : 'Coordinación afectada'}
          </small>
        </span>
      </div>
    </article>
  )
}

export const IslandNode = memo(IslandNodeView)
