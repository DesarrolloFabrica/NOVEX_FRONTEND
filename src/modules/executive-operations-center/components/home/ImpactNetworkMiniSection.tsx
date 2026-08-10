import { Link } from 'react-router-dom'
import type { EocImpactMiniMap } from '@/modules/executive-operations-center/types/executive-home.types'
import { ExecutiveHomeSection } from '@/modules/executive-operations-center/components/home/ExecutiveHomeSection'
import { severityClass } from '@/modules/executive-operations-center/utils/severityDisplay'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface ImpactNetworkMiniSectionProps {
  map: EocImpactMiniMap
}

export function ImpactNetworkMiniSection({ map }: ImpactNetworkMiniSectionProps) {
  const nodeById = Object.fromEntries(map.nodes.map((n) => [n.id, n]))

  return (
    <ExecutiveHomeSection
      id="eoc-impact"
      eyebrow="Propagación institucional"
      title="Red de Impacto"
      integrationNote="GET /coordinations/impact-graph/summary — topología simplificada con nodos activos, severidad y dependencias. Enlace a /red-impacto para vista completa."
      action={
        <Link to="/red-impacto" className="eoc-link-action" viewTransition>
          Ver mapa completo
          <NovexIcon name="arrow-up-right" size={14} />
        </Link>
      }
    >
      <div className="eoc-impact">
        <div className="eoc-impact__hotspot">
          <span>Punto crítico actual</span>
          <strong>{map.hotspotCoordination}</strong>
        </div>
        <div className="eoc-impact__visual">
          <svg
            className="eoc-impact__canvas"
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Mini mapa de red de impacto. Coordinación crítica: ${map.hotspotCoordination}`}
          >
            {map.edges.map((edge) => {
              const from = nodeById[edge.from]
              const to = nodeById[edge.to]
              if (!from || !to) return null
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="eoc-impact__edge"
                />
              )
            })}
            {map.nodes.map((node) => {
              const isHotspot =
                node.label.toLowerCase() ===
                map.hotspotCoordination.toLowerCase()
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  {isHotspot ? (
                    <circle r="12" className="eoc-impact__node-pulse" />
                  ) : null}
                  <circle
                    r={isHotspot ? 8 : 6}
                    className={`eoc-impact__node ${severityClass(node.severity)}`}
                  />
                  <text y={13} className="eoc-impact__label">
                    {node.label}
                  </text>
                  <text y={19} className="eoc-impact__count">
                    {node.activeSituations} activas
                  </text>
                </g>
              )
            })}
          </svg>
          <ul className="eoc-impact__legend">
            {map.nodes.map((node) => (
              <li key={node.id}>
                <span
                  className={`eoc-impact__dot ${severityClass(node.severity)}`}
                />
                <span>{node.label}</span>
                <strong>{node.activeSituations}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ExecutiveHomeSection>
  )
}
