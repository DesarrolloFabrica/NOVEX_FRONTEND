import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { hexToRgbChannels } from '@/modules/impact-network/data/coordination-islands.config'
import { CoordinationProblemFilters } from '@/modules/operational-cards/components/CoordinationProblemFilters'
import { ProblemRow } from '@/modules/operational-cards/components/ProblemRow'
import {
  buildFilteredEmptyMessage,
  filterActiveProblems,
  isDefaultProblemListFilters,
  needsActiveProblems,
  needsClosedProblems,
  PANEL_STATUS_LABEL,
  type CoordinationPanelProblem,
  type ProblemListFilters,
} from '@/modules/operational-cards/data/coordinationProblemFilters'
import { useClosedCoordinationProblems } from '@/modules/operational-cards/hooks/useClosedCoordinationProblems'
import { useProblemListFilters } from '@/modules/operational-cards/hooks/useProblemListFilters'
import type { CoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import type { CoordinationOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type { OperationalCardsLevel1State } from '@/modules/operational-cards/types/operational-cards.state'
import { resolveTicketTheme } from '@/modules/operational-cards/experience/ticketThemes'
// La superficie de la lista vive en la hoja de la baraja, que es donde la
// estrenó el panel: se importa aquí para no depender de que otro componente
// la haya cargado antes.
import '@/styles/operational-cards.css'

/**
 * LEVEL 1 de la coordinación observada: quién es y qué le pasa.
 *
 * Es la mitad FUNCIONAL de `CoordinationProblemPanel`, extraída cuando la
 * lectura de problemas dejó la mesa y pasó a su región permanente del shell. La
 * otra mitad —el nodo posicionador, el `translateX` en anchos de carta, el pico
 * hacia la carta y la entrada animada desde ella— no se extrajo: se retiró. Ese
 * era el trabajo de colgar el panel de una carta concreta, y una región fija no
 * cuelga de nada. Por eso no hay dos lecturas de problemas conviviendo: hay una,
 * y cambió de sitio.
 *
 * NO CARGA NADA. Recibe `level1` ya resuelto por el controlador de la escena,
 * que es quien pide LEVEL 1 la primera vez que se observa una coordinación y
 * quien lo tiene cacheado al volver. Mover la lista de lugar no podía
 * convertirse en una segunda petición.
 *
 * El estado operacional es el de LEVEL 0 y no se recalcula con los problemas
 * cargados: el backend sigue siendo la autoridad de integridad. La cabecera ya
 * no lo pinta (lo cuentan la carta y el personaje); queda en `data-status`.
 *
 * Conserva las clases visuales del panel a propósito: esta fase MUEVE la
 * lectura, no la rediseña, y reescribir su superficie habría mezclado dos
 * cambios que deben poder revisarse por separado.
 */

const SKELETON_ROWS = 3

export interface CoordinationProblemListProps {
  coordination: CoordinationOverview
  identity: CoordinationVisualIdentity
  /** Nombre de PRODUCTO. Puede diferir del nombre técnico de la fila. */
  productLabel?: string
  level1: OperationalCardsLevel1State
  /** Qué problema alimenta ahora mismo la región de detalle. */
  selectedProblemId?: string | null
  onProblemSelect?: (problemId: string) => void
  /** Reintenta LEVEL 1 para esta misma coordinación. */
  onRetry?: () => void
  /** Nombres de presentación por code, para la línea de origen de cada fila. */
  labelByCode?: Readonly<Record<string, string>>
  /** Colores de overview por code (talón de identidad). */
  colorByCode?: Readonly<Record<string, string>>
  /**
   * Filtros controlados por el padre. Dirección los guarda porque desmonta la
   * lista mientras enseña el detalle; sin ellos, la lista guarda los suyos.
   */
  filters?: ProblemListFilters
  onFiltersChange?: (next: ProblemListFilters) => void
}

/**
 * Pie de la lista de cerrados: carga la página siguiente al acercarse el
 * scroll (IntersectionObserver sobre el viewport de la lista) y, por si el
 * observador no existe o se prefiere el teclado, es también un botón.
 */
function ClosedLoadMore({
  rootRef,
  remaining,
  loading,
  error,
  onLoadMore,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  remaining: number
  loading: boolean
  error: string | null
  onLoadMore: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const target = ref.current
    if (!target || loading || error) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { root: rootRef.current, rootMargin: '0px 0px 96px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loading, error, onLoadMore, rootRef])

  return (
    <button
      ref={ref}
      type="button"
      className="coordination-panel__load-more"
      data-testid="coordination-panel-load-more"
      disabled={loading}
      onClick={onLoadMore}
    >
      {loading
        ? 'Cargando cerrados…'
        : error
          ? 'No se pudieron cargar más cerrados. Reintentar'
          : `Ver más cerrados (${remaining})`}
    </button>
  )
}

export function CoordinationProblemList({
  coordination,
  identity,
  productLabel,
  level1,
  selectedProblemId,
  onProblemSelect,
  onRetry,
  labelByCode,
  colorByCode,
  filters: controlledFilters,
  onFiltersChange,
}: CoordinationProblemListProps) {
  const name = productLabel ?? identity.name
  const scrollerRef = useRef<HTMLDivElement>(null)

  const [ownFilters, setOwnFilters] = useProblemListFilters(coordination.code)
  const filters = controlledFilters ?? ownFilters
  const setFilters = onFiltersChange ?? setOwnFilters

  /*
   * QUÉ SE ENSEÑA CON LOS FILTROS.
   *
   * Los activos salen de LEVEL 1, tal cual estaba cargado, y se filtran aquí.
   * Los cerrados se piden aparte, paginados y con la severidad en el servidor,
   * solo cuando el estado los incluye. La cabecera y el badge NO miran esto:
   * siguen contando el universo activo y el snapshot operacional.
   */
  const showActive = needsActiveProblems(filters.status)
  const showClosed = needsClosedProblems(filters.status)
  const closed = useClosedCoordinationProblems({
    coordinationUuid: coordination.id,
    severity: filters.severity === 'ALL' ? null : filters.severity,
    enabled: showClosed,
  })

  const activeLoading =
    showActive && (level1.status === 'loading' || level1.status === 'idle')
  const activeError = showActive && level1.status === 'error'
  const closedLoading = showClosed && closed.status === 'loading'
  const closedError = showClosed && closed.status === 'error'

  const rows: readonly CoordinationPanelProblem[] = [
    ...(showActive && level1.status === 'ready'
      ? filterActiveProblems(level1.problems, filters)
      : []),
    ...(showClosed && closed.status === 'ready' ? closed.problems : []),
  ]

  const restricted =
    (showActive && level1.status === 'ready' && level1.scope === 'own-only') ||
    (showClosed && closed.status === 'ready' && closed.scope === 'own-only')
  const defaultFilters = isDefaultProblemListFilters(filters)

  const headingId = `coordination-list-title-${coordination.code}`

  /*
   * CABECERA MÍNIMA: solo «Problemas de la coordinación».
   *
   * El nombre del área, el recuento y el estado de integridad ya los cuentan
   * la carta, el personaje y sus vidas; repetirlos aquí le quitaba alto a la
   * lista. No se recalcula ni se oculta ningún dato: simplemente esta región
   * deja de pintarlos. El estado sigue en `data-status` y el nombre del área
   * viaja en el encabezado como texto para lectores de pantalla, para que la
   * región siga diciendo DE QUÉ coordinación habla.
   */
  const ticketThemeId = resolveTicketTheme(coordination.code)
  const ticketPilot = Boolean(ticketThemeId)

  const bodyContent = (
    <>
      <CoordinationProblemFilters filters={filters} onChange={setFilters} />

      {/*
        Aviso de lectura parcial: va DESPUÉS del encabezado del ticket
        para no competir con el título. Mismo testid que en el shell.
      */}
      {restricted ? (
        <p
          className="coordination-panel__scope-note"
          data-testid="coordination-scope-note"
          role="status"
        >
          Solo se muestran los problemas que usted reportó en esta
          coordinación. No es la lista completa del área.
        </p>
      ) : null}

      {activeLoading || (closedLoading && rows.length === 0) ? (
        <div
          className="coordination-panel__skeleton"
          data-testid="coordination-panel-loading"
          aria-hidden="true"
        >
          {Array.from({ length: SKELETON_ROWS }, (_unused, index) => (
            <span key={index} />
          ))}
        </div>
      ) : activeError ? (
        /*
          ERROR DE CARGA. Lleva su propio reintento: no saber si hay problemas
          no es lo mismo que saber que no los hay, y el usuario debe poder
          distinguirlo y volver a intentarlo sin recargar la pantalla.
        */
        <div
          className="coordination-panel__notice"
          data-testid="coordination-panel-error"
          role="alert"
        >
          <p>No pudimos cargar los problemas de esta coordinación.</p>
          {onRetry && (
            <button
              type="button"
              className="coordination-panel__retry"
              data-testid="coordination-panel-retry"
              onClick={onRetry}
            >
              Reintentar
            </button>
          )}
        </div>
      ) : closedError && rows.length === 0 ? (
        <div
          className="coordination-panel__notice"
          data-testid="coordination-panel-closed-error"
          role="alert"
        >
          <p>No pudimos cargar los problemas cerrados de esta coordinación.</p>
          <button
            type="button"
            className="coordination-panel__retry"
            data-testid="coordination-panel-closed-retry"
            onClick={closed.retry}
          >
            Reintentar
          </button>
        </div>
      ) : rows.length === 0 ? (
        /*
         * VACÍO, PERO ¿VACÍO DE QUÉ?
         *
         * Con lectura COMPLETA, cero resultados significa que el área no tiene
         * problemas activos. Con lectura PARCIAL solo significa que no hay
         * ninguno que este usuario pueda ver, y decir «todo bajo control» sería
         * afirmar algo que nadie ha comprobado: el estado del área lo da el
         * resumen autorizado, y puede ser CRÍTICO mientras esta lista está
         * vacía. El alcance lo declara el servidor; aquí solo se obedece. Con
         * filtros, el vacío nombra la combinación elegida.
         */
        !defaultFilters ? (
          <p
            className="coordination-panel__empty"
            data-testid="coordination-panel-empty-filtered"
          >
            {buildFilteredEmptyMessage(
              filters,
              restricted ? 'own-only' : 'complete',
            )}
          </p>
        ) : restricted ? (
          <p
            className="coordination-panel__empty"
            data-testid="coordination-panel-empty-restricted"
          >
            No hay problemas activos visibles para tu usuario
          </p>
        ) : (
          <p
            className="coordination-panel__empty"
            data-testid="coordination-panel-empty"
          >
            Sin problemas activos
          </p>
        )
      ) : (
        <div
          ref={scrollerRef}
          className="coordination-panel__problems"
          data-testid="coordination-panel-problems"
          // Contenedor enfocable: la lista tiene scroll propio y debe poder
          // recorrerse con el teclado. No es una trampa de foco: el tabulador
          // entra y sale con normalidad.
          tabIndex={0}
          role="group"
          aria-label={`${defaultFilters ? 'Problemas activos' : 'Problemas filtrados'} de ${productLabel ?? identity.shortName}`}
        >
          {rows.map((problem) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              selectedCoordinationCode={coordination.code}
              selected={problem.id === selectedProblemId}
              onSelect={onProblemSelect}
              labelByCode={labelByCode}
              colorByCode={colorByCode}
              statusLabels={PANEL_STATUS_LABEL}
            />
          ))}

          {/* «Todos»: los activos ya están; los cerrados llegan después. */}
          {closedLoading ? (
            <p
              className="coordination-panel__list-note"
              data-testid="coordination-panel-closed-loading"
              role="status"
            >
              Cargando cerrados…
            </p>
          ) : null}

          {closedError ? (
            <div
              className="coordination-panel__list-note"
              data-testid="coordination-panel-closed-error"
              role="alert"
            >
              No pudimos cargar los cerrados.{' '}
              <button
                type="button"
                className="coordination-panel__retry"
                data-testid="coordination-panel-closed-retry"
                onClick={closed.retry}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {closed.hasMore ? (
            <ClosedLoadMore
              rootRef={scrollerRef}
              remaining={Math.max(0, closed.total - closed.problems.length)}
              loading={closed.loadingMore}
              error={closed.loadMoreError}
              onLoadMore={closed.loadMore}
            />
          ) : null}
        </div>
      )}
    </>
  )

  const headerBlock = (
    <header className="coordination-panel__header">
      <div className="coordination-panel__heading">
        <h3
          id={headingId}
          className={
            ticketPilot
              ? 'coordination-panel__name coordination-panel__name--circus'
              : 'coordination-panel__name'
          }
        >
          Problemas de la coordinación
          <span className="coordination-panel__sr-only">: {name}</span>
        </h3>
      </div>
    </header>
  )

  return (
    <section
      className={[
        'coordination-panel',
        'coordination-panel--region',
        ticketPilot ? 'coordination-panel--ticket-pilot' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="coordination-problem-list"
      data-surface="coordination-problems"
      data-code={coordination.code}
      data-status={coordination.status}
      data-level1={level1.status}
      data-scope={level1.scope}
      data-ticket-pilot={ticketThemeId}
      data-filter-severity={filters.severity}
      data-filter-status={filters.status}
      style={
        { '--coord-rgb': hexToRgbChannels(identity.color) } as CSSProperties
      }
      aria-labelledby={headingId}
    >
      {ticketPilot ? (
        <>
          <div className="coordination-panel__stub">{headerBlock}</div>
          <div className="coordination-panel__body">{bodyContent}</div>
        </>
      ) : (
        <>
          {headerBlock}
          {bodyContent}
        </>
      )}
    </section>
  )
}
