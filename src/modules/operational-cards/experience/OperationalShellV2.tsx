import { useMemo, type ReactNode } from 'react'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { buildDirectionSummary } from '@/modules/operational-cards/data/directionSummary'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'

/**
 * SHELL del Centro Operacional: dos zonas y un control inferior.
 *
 *   ┌──────────────────────────────────────┬──────────┐
 *   │ personaje │ problemas │ detalle      │          │
 *   ├──────────────────────────────────────┤   KPIs   │
 *   │               BARAJA                 │          │
 *   └──────────────────────────────────────┴──────────┘
 *                    [ menú ]
 *
 * La pantalla deja de ser «la mesa» para pasar a ser una escena con dos
 * lecturas permanentes: a la IZQUIERDA se opera —se elige carta, se leen los
 * problemas del área y el detalle del que se esté mirando—, y a la DERECHA vive
 * el estado, en un carril que acompaña a toda la escena en lugar de competir
 * con las otras lecturas desde una cuarta tarjeta.
 *
 * EL PERSONAJE YA VIVE AQUÍ. Es la primera región que deja de ser un hueco: el
 * anfitrión de la escena tiene sitio propio y permanente en vez de compartir
 * columna con la baraja y cederle alto cada vez que se observaba una
 * coordinación. La lista de problemas, el detalle y los indicadores siguen
 * siendo placeholders y llegan en sus fases.
 *
 * QUIÉN CREA EL ESTADO. El shell llama al hook UNA vez y baja el controlador a
 * la experiencia. El personaje y la mesa leen la misma selección, el mismo
 * hover y el mismo LEVEL 0 porque son literalmente el mismo objeto: dos
 * llamadas al hook habrían dado dos reducers, dos peticiones y dos verdades.
 *
 * La banda de la baraja es además la que DEFINE el tamaño de carta. Hasta aquí
 * la unidad salía del viewport, y con una columna más estrecha que la pantalla
 * eso dejaba el arco saliéndose por los dos lados —medido en la prueba espacial:
 * 160 px por cada lado a 1440—. Ahora la unidad se deduce del ancho real de la
 * banda, así que la mesa cabe por construcción y no por coincidencia.
 */

/** Una región del shell. Contenedor real de layout con marcador dentro. */
function ShellRegion({
  region,
  title,
  hint,
  className = '',
  showTitle = true,
  children,
}: {
  region: string
  title: string
  hint?: string
  className?: string
  /**
   * Una región con contenido real no necesita rótulo: la pieza ya se explica
   * sola. El nombre sigue existiendo como `aria-label`, así que la región no
   * deja de ser navegable por landmarks aunque no se dibuje encabezado.
   */
  showTitle?: boolean
  children?: ReactNode
}) {
  return (
    <section
      className={`operational-shell__region ${className}`.trim()}
      data-testid={`shell-region-${region}`}
      data-region={region}
      aria-label={title}
    >
      {showTitle && <h2 className="operational-shell__region-title">{title}</h2>}
      {showTitle && hint && (
        <p className="operational-shell__region-hint">{hint}</p>
      )}
      {children}
    </section>
  )
}

/** Hueco de un indicador. Sin dato: la fuente real llega en su fase. */
function KpiPlaceholder({ index }: { index: number }) {
  return (
    <div className="operational-shell__kpi-slot" data-testid="shell-kpi-slot">
      <span className="operational-shell__kpi-label">Indicador {index}</span>
      <span className="operational-shell__kpi-value">—</span>
    </div>
  )
}

export function OperationalShellV2() {
  const controller = useOperationalOverview()
  const { level0, overview, selectedCoordinationCode, hoveredCoordinationCode } =
    controller

  // Un fallo de red, HTTP, parseo o contrato se comunica como DESCONOCIDO.
  // Nunca como ESTABLE, y nunca fabricando totales en cero.
  const directionStatus: OperationalIntegrityStatus =
    level0 === 'ready' && overview ? overview.directionStatus : 'DESCONOCIDO'

  /**
   * Hacia dónde mira el personaje: lo decide la POSICIÓN REAL de la carta
   * observada dentro de su banda, no su nombre ni un mapa fijo.
   *
   * El mapa sale de la misma geometría que dibuja la mesa: la misma proyección
   * de producto, la misma función de layout y las mismas opciones. Son
   * funciones puras sobre la misma lista de coordinaciones, de modo que el giro
   * no puede discrepar de lo que se ve; si un día la mesa cambia de orden, el
   * personaje gira con ella sin tocar nada de aquí.
   */
  const orientationByCode = useMemo(() => {
    const productTable = buildProductTable(overview?.coordinations ?? [])
    const topLevelRows = productTable.nodes.map((node) => node.coordination)
    return buildTableLayout(topLevelRows, { sortByDisplayOrder: false })
      .orientationByCode
  }, [overview])

  /**
   * La carta observada manda sobre la que está bajo el cursor: con una
   * coordinación seleccionada el personaje la mira, aunque el puntero pase por
   * encima de otra.
   */
  const characterPresentation = buildCharacterPresentation({
    directionStatus,
    orientation:
      (selectedCoordinationCode
        ? orientationByCode[selectedCoordinationCode]
        : hoveredCoordinationCode
          ? orientationByCode[hoveredCoordinationCode]
          : null) ?? 'NEUTRAL',
    hovering: Boolean(hoveredCoordinationCode),
    selecting: Boolean(selectedCoordinationCode),
  })

  const summary =
    level0 === 'ready' && overview
      ? buildDirectionSummary(overview.totals)
      : level0 === 'error'
        ? 'Estado no disponible'
        : 'Consultando el estado de las coordinaciones'

  return (
    <div className="operational-shell" data-testid="operational-shell">
      {/* ZONA OPERATIVA */}
      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          {/*
            El personaje ocupa su región entera, sin rótulo que lo presente: ya
            dice quién es y cómo está. Debajo, la frase institucional, que es la
            ÚNICA región `aria-live` de la escena: cuando también vivía en la
            miga, un lector de pantalla anunciaba la misma frase dos veces.
          */}
          <ShellRegion
            region="character"
            title="Estado de la Dirección de Operaciones"
            className="operational-shell__region--character"
            showTitle={false}
          >
            <DirectionCharacter presentation={characterPresentation} />
            <p
              className="operational-shell__summary"
              data-testid="direction-summary"
              aria-live="polite"
            >
              {summary}
            </p>
          </ShellRegion>
          <ShellRegion
            region="problem-list"
            title="Problemas del área"
            hint="Seleccione una coordinación"
          />
          <ShellRegion
            region="problem-detail"
            title="Detalle del problema"
            hint="Seleccione un problema"
          />
        </div>

        {/*
          La baraja, con toda su lógica intacta. Esta banda es su contenedor de
          referencia: de su ancho sale el tamaño de carta.
        */}
        <div className="operational-shell__stage" data-testid="shell-stage">
          <OperationalCardExperience controller={controller} />
        </div>
      </div>

      {/* CARRIL EJECUTIVO */}
      <ShellRegion
        region="kpi"
        title="Indicadores"
        hint="Dirección · coordinación observada"
        className="operational-shell__kpi"
      >
        <div className="operational-shell__kpi-list">
          {[1, 2, 3, 4].map((index) => (
            <KpiPlaceholder key={index} index={index} />
          ))}
        </div>
      </ShellRegion>

      {/* Control del menú inferior. Solo la región: el menú llega en su fase. */}
      <div className="operational-shell__bottom" data-testid="shell-bottom">
        <span className="operational-shell__bottom-label">Menú</span>
      </div>
    </div>
  )
}
