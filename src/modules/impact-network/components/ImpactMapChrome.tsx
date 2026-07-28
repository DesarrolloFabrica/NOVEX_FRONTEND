import type { FocusedPropagation } from '@/modules/impact-network/types/impact-network.types'
import type {
  OperationalEvent,
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

interface ImpactMapGuideProps {
  onRecenter: () => void
}

interface ImpactMapTelemetryProps {
  propagation: FocusedPropagation
  event: OperationalEvent | null
  riskLevel: RiskLevel | null
  riskScore: number
  propagationDurationLabel: string
}

const RISK_META: Record<
  RiskLevel,
  { label: string; compactLabel: string; barCount: number }
> = {
  critical: { label: 'Muy alto', compactLabel: 'Crítico', barCount: 9 },
  high: { label: 'Alto', compactLabel: 'Alto', barCount: 7 },
  moderate: { label: 'Medio', compactLabel: 'Moderado', barCount: 5 },
  low: { label: 'Bajo', compactLabel: 'Bajo', barCount: 3 },
}

const STATUS_LABEL: Record<OperationalEventStatus, string> = {
  open: 'Abierta',
  monitoring: 'En seguimiento',
  resolved: 'Resuelta',
  archived: 'Archivada',
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V5.8L13 3v18M13 8h7v13M2 21h20M7 8h2M7 12h2M7 16h2M16 11h1M16 15h1" />
    </svg>
  )
}

function RecenterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  )
}

function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="m12 13 4-4M12 17h.01" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function ImpactMapGuide({ onRecenter }: ImpactMapGuideProps) {
  return (
    <>
      <section className="impact-map-guide" aria-labelledby="impact-map-title">
        <h2 id="impact-map-title">Mapa de conexiones</h2>
        <p>
          Cada línea representa el nivel de impacto entre áreas. El grosor y
          color indican la magnitud del impacto.
        </p>

        <div className="impact-map-legend" aria-label="Nivel de impacto">
          <span className="impact-map-legend__title">Nivel de impacto</span>
          <span>
            <i data-tone="critical" />
            Muy alto
          </span>
          <span>
            <i data-tone="high" />
            Alto
          </span>
          <span>
            <i data-tone="moderate" />
            Medio
          </span>
          <span>
            <i data-tone="low" />
            Bajo
          </span>
        </div>

        <span className="impact-map-guide__live">
          <i aria-hidden="true" />
          Actualizado en tiempo real
        </span>
      </section>

      <button
        type="button"
        className="impact-map-recenter"
        onClick={onRecenter}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <RecenterIcon />
        Recentrar mapa
      </button>
    </>
  )
}

function getResolutionEstimate(event: OperationalEvent | null): string {
  const suggestions =
    event?.interpretation?.executiveReport?.timelineSuggestions ?? []
  const preferred =
    suggestions.find((item) => /^2\s*horas?$/i.test(item.horizon.trim())) ??
    suggestions[1] ??
    suggestions[0]
  return preferred?.horizon.replace(/\bhoras?\b/i, 'h') ?? 'Por estimar'
}

export function ImpactMapTelemetry({
  propagation,
  event,
  riskLevel,
  riskScore,
  propagationDurationLabel,
}: ImpactMapTelemetryProps) {
  const risk = riskLevel ?? 'moderate'
  const riskMeta = RISK_META[risk]
  const category = event?.interpretation?.categoryName ?? 'Operación'
  const eventStatus = event ? STATUS_LABEL[event.status] : 'En seguimiento'
  const resolutionEstimate = getResolutionEstimate(event)

  return (
    <>
      <aside
        className="impact-map-selection"
        data-risk={risk}
        aria-label="Situación seleccionada"
      >
        <span className="impact-map-selection__eyebrow">
          <i aria-hidden="true" />
          Situación seleccionada
        </span>
        <strong>{event?.title ?? 'Situación operacional en análisis'}</strong>
        <span className="impact-map-selection__meta">
          {category} <b aria-hidden="true">•</b> {eventStatus}
        </span>
        <span className="impact-map-selection__bell" aria-hidden="true">
          <GaugeIcon />
        </span>
        <span className="impact-map-selection__arrow" aria-hidden="true">
          ›
        </span>
      </aside>

      <section
        className="impact-map-summary"
        data-risk={risk}
        aria-label="Resumen del impacto seleccionado"
      >
        <div className="impact-map-summary__metric impact-map-summary__metric--origin">
          <span className="impact-map-summary__icon">
            <BuildingIcon />
          </span>
          <span>
            <small>Área origen</small>
            <strong>{propagation.originName}</strong>
          </span>
        </div>

        <div className="impact-map-summary__metric">
          <span className="impact-map-summary__signal" aria-hidden="true" />
          <span>
            <small>Coordinaciones afectadas</small>
            <strong>{propagation.affectedCoordinationIds.length}</strong>
            <em>Áreas conectadas</em>
          </span>
        </div>

        <div className="impact-map-summary__metric impact-map-summary__metric--impact">
          <span>
            <small>Impacto general</small>
            <strong>{riskMeta.label}</strong>
            <span
              className="impact-map-summary__bars"
              aria-label={`${riskMeta.barCount} de 10 segmentos`}
            >
              {Array.from({ length: 10 }, (_, index) => (
                <i key={index} data-active={index < riskMeta.barCount} />
              ))}
            </span>
          </span>
        </div>

        <div className="impact-map-summary__metric impact-map-summary__metric--risk">
          <span>
            <small>Riesgo estimado</small>
            <strong>
              {Math.round(riskScore)}
              <b>/100</b>
            </strong>
            <em>{riskMeta.compactLabel}</em>
          </span>
          <svg
            className="impact-map-summary__sparkline"
            viewBox="0 0 116 48"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="impact-spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity=".24" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="impact-map-summary__spark-fill"
              d="M2 44 2 39 12 37 21 27 31 29 43 17 55 9 67 24 77 26 89 12 101 24 114 20 114 44Z"
            />
            <path
              className="impact-map-summary__spark-line"
              d="M2 39 12 37 21 27 31 29 43 17 55 9 67 24 77 26 89 12 101 24 114 20"
            />
            <g className="impact-map-summary__spark-dots">
              <circle cx="2" cy="39" r="1.8" />
              <circle cx="31" cy="29" r="1.8" />
              <circle cx="55" cy="9" r="1.8" />
              <circle cx="77" cy="26" r="1.8" />
              <circle cx="114" cy="20" r="1.8" />
            </g>
          </svg>
        </div>

        <div className="impact-map-summary__metric impact-map-summary__metric--time">
          <span>
            <small>Tiempo estimado resolución</small>
            <strong>{resolutionEstimate}</strong>
            <em>
              {propagationDurationLabel === '—'
                ? 'En promedio'
                : `Propagación: ${propagationDurationLabel}`}
            </em>
          </span>
          <span className="impact-map-summary__clock" aria-hidden="true">
            <ClockIcon />
          </span>
        </div>
      </section>
    </>
  )
}
