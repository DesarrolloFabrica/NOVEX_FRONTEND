import type {
  OperationalMapDensity,
  OperationalMapTerrain,
  OperationalMapTerritory,
} from '@/modules/impact-network/engine/operational-map-layout'
import { OPERATIONAL_MAP_VIEWBOX } from '@/modules/impact-network/data/operational-territories.config'

interface OperationalTerritoryBackdropProps {
  terrain: OperationalMapTerrain
  territories: readonly OperationalMapTerritory[]
  density?: OperationalMapDensity
}

/**
 * Un solo terreno institucional. Las regiones existen como subdivisiones
 * internas (fronteras tenues, etiquetas HUD, lavado de luz) y nunca como
 * cuatro plataformas independientes. El lenguaje de líneas entre islas
 * queda reservado para el impacto real.
 */
export function OperationalTerritoryBackdrop({
  terrain,
  territories,
  density = 'standard',
}: OperationalTerritoryBackdropProps) {
  return (
    <div
      className="impact-executive__territory"
      data-density={density}
      aria-hidden="true"
    >
      {territories.map((territory) => (
        <span
          key={territory.id}
          className="impact-executive__territory-wash"
          data-tone={territory.tone}
          data-holds-focus={territory.holdsFocus}
          style={{
            left: `${territory.labelX * 100}%`,
            top: `${territory.labelY * 100}%`,
          }}
        />
      ))}

      <svg
        className="impact-executive__territory-svg"
        viewBox={`0 0 ${OPERATIONAL_MAP_VIEWBOX.width} ${OPERATIONAL_MAP_VIEWBOX.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="executive-territory-survey"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M22 0H0V22"
              fill="none"
              stroke="#4bb6ee"
              strokeOpacity=".045"
              strokeWidth=".5"
            />
          </pattern>
          <clipPath id="clip-operational-terrain">
            <path d={terrain.landPath} />
          </clipPath>
        </defs>

        <path className="impact-executive__territory-land" d={terrain.landPath} />
        <path
          className="impact-executive__territory-shelf"
          d={terrain.landPath}
          clipPath="url(#clip-operational-terrain)"
        />
        <rect
          className="impact-executive__territory-survey"
          x="0"
          y="0"
          width={OPERATIONAL_MAP_VIEWBOX.width}
          height={OPERATIONAL_MAP_VIEWBOX.height}
          fill="url(#executive-territory-survey)"
          clipPath="url(#clip-operational-terrain)"
        />
        <g
          className="impact-executive__territory-contours"
          clipPath="url(#clip-operational-terrain)"
        >
          {terrain.contourPaths.map((path) => (
            <path key={path} d={path} />
          ))}
        </g>
        <g className="impact-executive__territory-marks">
          {terrain.markerPoints.map(([cx, cy], index) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={index % 3 === 0 ? 1.7 : 1}
              data-major={index % 3 === 0}
            />
          ))}
        </g>
        <g className="impact-executive__territory-borders">
          {terrain.borderPaths.map((path) => (
            <path
              key={path}
              className="impact-executive__territory-border"
              d={path}
            />
          ))}
        </g>
        <path className="impact-executive__territory-coast" d={terrain.coastPath} />
      </svg>

      <div className="impact-executive__territory-labels">
        {territories.map((territory) => (
          <span
            key={territory.id}
            data-tone={territory.tone}
            data-align={territory.labelAlign}
            style={{
              left: `${territory.labelX * 100}%`,
              top: `${territory.labelY * 100}%`,
            }}
          >
            <b>Sector {territory.sectorCode}</b>
            <em>{territory.label}</em>
          </span>
        ))}
      </div>

      <div className="impact-executive__territory-compass">
        <b>N</b>
        <i />
      </div>
    </div>
  )
}
