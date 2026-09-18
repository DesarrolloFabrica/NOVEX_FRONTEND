import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import { OperationalActionPanel } from '@/modules/operational-cards/components/OperationalActionPanel'
import { resolveCharacterMood } from '@/modules/operational-cards/data/characterMood'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { buildDirectionSummary } from '@/modules/operational-cards/data/directionSummary'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import {
  emptyReportDraft,
  reportDraftKey,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import { nowAsLocalInput } from '@/modules/operational-cards/services/report-submission.service'
import { fetchIncidentCategories } from '@/modules/api/situations.api'
import { getErrorMessage } from '@/shared/utils/error'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import { OPERATIONAL_STATUS_LABEL } from '@/modules/operational-cards/data/operationalStatusLabel'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'

/**
 * Código de catálogo de Fábrica de Contenidos (`productHierarchy` /
 * `coordination-islands`). Solo esta selección activa la prueba visual de
 * tickets; no se inventa otro controlador ni otra rama de estado.
 */
const FABRICA_CONTENIDOS_CODE = 'coord-fabrica-contenidos' as const

/**
 * Adornos de la prueba visual de Fábrica: marca de agua (foca) + ondas/burbujas
 * CSS. Son presentacionales y quedan detrás del contenido real.
 */
function TicketFabricaDecor() {
  return (
    <>
      <span className="ticket-fabrica-watermark" aria-hidden="true" />
      <span
        className="ticket-fabrica-ornament ticket-fabrica-ornament--wave"
        aria-hidden="true"
      />
      <span
        className="ticket-fabrica-ornament ticket-fabrica-ornament--bubbles"
        aria-hidden="true"
      />
    </>
  )
}

/**
 * PILOTO · capas del ticket en «Problemas de la coordinación».
 * Separadas del contenido: ignoran puntero y quedan ocultas a AT.
 * Rutas canónicas bajo /assets/tickets/ (ver CSS del piloto).
 */
function TicketFabricaProblemsPilot() {
  /*
   * Silueta + banda impresa (equiv. banda roja de la referencia, en turquesa).
   * - #ticketPilotEdge: máscara CSS de la región (papel + muescas semicirculares).
   * - #ticketSil: path base; la banda se obtiene restando un inset interior.
   * - Desgaste: ticket-ink-wear.svg (patrón estable) sobre banda y adornos.
   * PNG originales intactos; la máscara solo oculta tinta, no baja opacidad.
   */
  const cut = '/assets/tickets/fabrica/cut'
  const header = `${cut}/ornament-header.png`
  /*
   * Contorno en viewBox 400×268. Muescas = arcos A (semicírculos ~ r=10)
   * centrados en y≈108 (alineados a --ticket-pilot-perf-y).
   */
  const sil =
    'M 5 4 C 70 1.5 140 5 200 3 C 270 1 330 4.5 388 6 C 395 7 398 14 398.5 28 L 399 98 A 10 10 0 0 1 399 118 L 398.5 240 C 398 252 390 262 376 264 C 300 267 220 263 140 265 C 70 266.5 30 263 12 258 C 5 255 3.5 248 3.5 238 L 3 120 A 10 10 0 0 1 3 100 L 3.5 26 C 4 12 4.5 5.5 5 4 Z'

  return (
    <div className="ticket-pilot-fabrica" aria-hidden="true">
      <svg
        className="ticket-pilot-fabrica__mask-svg"
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Máscara de región: objectBoundingBox para escalar con el panel. */}
          <mask
            id="ticketPilotEdge"
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
          >
            <rect width="1" height="1" fill="#000000" />
            <path
              fill="#ffffff"
              d="M 0.012 0.015
                 C 0.18 0.006 0.35 0.018 0.50 0.011
                 C 0.68 0.004 0.82 0.016 0.97 0.022
                 C 0.988 0.026 0.996 0.05 0.997 0.10
                 L 0.998 0.360
                 C 0.998 0.360 0.955 0.360 0.955 0.403
                 C 0.955 0.445 0.998 0.445 0.998 0.445
                 L 0.997 0.90
                 C 0.995 0.94 0.97 0.98 0.94 0.985
                 C 0.75 0.995 0.55 0.98 0.35 0.988
                 C 0.18 0.995 0.08 0.98 0.03 0.96
                 C 0.012 0.95 0.008 0.92 0.008 0.89
                 L 0.007 0.445
                 C 0.007 0.445 0.050 0.445 0.050 0.403
                 C 0.050 0.360 0.007 0.360 0.007 0.360
                 L 0.008 0.10
                 C 0.009 0.05 0.01 0.02 0.012 0.015
                 Z"
            />
          </mask>
        </defs>
      </svg>

      <div className="ticket-pilot-fabrica__paper" />

      {/*
        Banda impresa ancha (sustituye el marco fino).
        Sigue la silueta y las muescas; filetes interiores + máscara de desgaste.
      */}
      <svg
        className="ticket-pilot-fabrica__band"
        viewBox="0 0 400 268"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <path id="ticketSil" d={sil} />
        </defs>
        {/*
          Banda ancha = stroke sobre la silueta (sigue esquinas y muescas).
          Escala 0.978 ≈ fringe de papel fuera; strokeWidth ~16 → ~8–10 px
          en panel ~400 de ancho. Los filetes van más adentro.
        */}
        <use
          href="#ticketSil"
          className="ticket-pilot-fabrica__band-stroke"
          fill="none"
          stroke="#0c5f68"
          strokeWidth="16"
          strokeLinejoin="round"
          strokeLinecap="round"
          transform="translate(200 134) scale(0.978) translate(-200 -134)"
        />
        <use
          href="#ticketSil"
          className="ticket-pilot-fabrica__band-fillet"
          fill="none"
          stroke="#0a5560"
          strokeWidth="1.4"
          strokeLinejoin="round"
          transform="translate(200 134) scale(0.938) translate(-200 -134)"
        />
        <use
          href="#ticketSil"
          className="ticket-pilot-fabrica__band-fillet"
          fill="none"
          stroke="#0a5560"
          strokeWidth="0.9"
          strokeLinejoin="round"
          transform="translate(200 134) scale(0.928) translate(-200 -134)"
        />
      </svg>

      <div className="ticket-pilot-fabrica__watermark" />

      {/* Adornos: misma máscara de desgaste; PNG sin modificar. */}
      <div className="ticket-pilot-fabrica__ornaments">
        <img
          className="ticket-pilot-fabrica__ornament ticket-pilot-fabrica__ornament--header-left"
          src={header}
          alt=""
          draggable={false}
        />
        <img
          className="ticket-pilot-fabrica__ornament ticket-pilot-fabrica__ornament--header-right"
          src={header}
          alt=""
          draggable={false}
        />
        <img
          className="ticket-pilot-fabrica__ornament ticket-pilot-fabrica__ornament--bottom-left"
          src={`${cut}/ornament-bottom-left.png`}
          alt=""
          draggable={false}
        />
        <img
          className="ticket-pilot-fabrica__ornament ticket-pilot-fabrica__ornament--bottom-right"
          src={`${cut}/ornament-bottom-right.png`}
          alt=""
          draggable={false}
        />
      </div>

      <div className="ticket-pilot-fabrica__perforation" />
    </div>
  )
}

/**
 * SHELL del Centro Operacional. Cinco regiones y un control inferior.
 *
 *   ┌──────────┬──────────────┬──────────────┬─────────────┐
 *   │personaje │ MIS REPORTES │ PROBLEMAS DE │  REPORTAR / │
 *   ├──────────┴──────────────┤ LA COORDIN.  │   DETALLE   │
 *   │        BARAJA           │              │  + ACCIONES │
 *   └─────────────────────────┴──────────────┴─────────────┘
 *                     [ menú ]
 *
 * QUÉ CAMBIÓ RESPECTO A LA FASE ANTERIOR. Las tres listas se reordenaron y el
 * carril de indicadores desapareció:
 *
 *   IZQUIERDA  «Mis reportes»: lo que ESTE usuario ha reportado, en cualquier
 *              coordinación. Es la única lista que NO depende de la carta.
 *   CENTRO     Los problemas de la coordinación seleccionada, con el mismo
 *              componente y el mismo orden por criticidad de antes.
 *   DERECHA    Ya no muestra indicadores: es donde se OPERA. Formulario de
 *              reporte o detalle del problema con sus acciones.
 *
 * LOS INDICADORES NO SE RECONSTRUYEN EN OTRA REGIÓN. Lo que alimentaban —el
 * estado de cada área— sigue vivo donde importa: el aura de las cartas y la
 * expresión del personaje, que leen el mismo `overview` de LEVEL 0.
 *
 * UNA SOLA SELECCIÓN. Las dos listas abren el MISMO detalle porque comparten
 * `selectedProblemId`. No hay dos versiones del problema seleccionado.
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

export function OperationalShellV2() {
  const controller = useOperationalOverview()
  const { level0, overview, selectedCoordinationCode, hoveredCoordinationCode } =
    controller

  // Un fallo de red, HTTP, parseo o contrato se comunica como DESCONOCIDO.
  const directionStatus: OperationalIntegrityStatus =
    level0 === 'ready' && overview ? overview.directionStatus : 'DESCONOCIDO'

  /**
   * Catálogo de categorías de incidente. Es un dato del formulario, así que se
   * pide UNA vez al montar y no cada vez que se abre el panel.
   */
  const [categories, setCategories] = useState<IncidentCategorySummary[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetchIncidentCategories()
      .then((items) => {
        if (!active) return
        setCategories(items.filter((item) => item.isSelectable !== false))
      })
      .catch((error: unknown) => {
        if (!active) return
        setCategoriesError(getErrorMessage(error))
      })
    return () => {
      active = false
    }
  }, [])

  /** Proyección de producto: giro del personaje y nombre de cada coordinación. */
  const { orientationByCode, labelByCode } = useMemo(() => {
    const productTable = buildProductTable(overview?.coordinations ?? [])
    const topLevelRows = productTable.nodes.map((node) => node.coordination)
    const labels: Record<string, string> = {}
    for (const node of productTable.nodes) {
      labels[node.coordination.code] = node.label
      for (const child of node.children) labels[child.code] = child.label
    }
    return {
      orientationByCode: buildTableLayout(topLevelRows, {
        sortByDisplayOrder: false,
      }).orientationByCode,
      labelByCode: labels,
    }
  }, [overview])

  const selectedCoordination = useMemo(
    () =>
      overview?.coordinations.find(
        (coordination) => coordination.code === selectedCoordinationCode,
      ) ?? null,
    [overview, selectedCoordinationCode],
  )

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

  /** La cara acompaña a lo observado; el rótulo sigue siendo institucional. */
  const characterMood = resolveCharacterMood({ selectedCoordination })

  /**
   * REACCIÓN PUNTUAL. Solo se representa si el hecho pertenece a la coordinación
   * que el usuario está observando: un reporte registrado en otra área no debe
   * leerse como si hubiera ocurrido en la seleccionada. Si no coincide, la
   * reacción se consume igualmente para que no quede pendiente.
   */
  const pending = controller.pendingCharacterReaction
  const reaccionVisible =
    pending !== null && pending.coordinationCode === selectedCoordinationCode

  useEffect(() => {
    if (pending && !reaccionVisible) {
      controller.consumeCharacterReaction(pending.id)
    }
  }, [pending, reaccionVisible, controller])

  const summary =
    level0 === 'ready' && overview
      ? buildDirectionSummary(overview.totals)
      : level0 === 'error'
        ? 'Estado no disponible'
        : 'Consultando el estado de las coordinaciones'

  // ---------- Panel derecho ----------

  const draftKey = reportDraftKey(selectedCoordinationCode)
  const draft =
    controller.reportDrafts[draftKey] ?? emptyReportDraft(nowAsLocalInput())

  const learningDraft = controller.selectedProblemId
    ? (controller.learningDrafts[controller.selectedProblemId] ?? '')
    : ''

  /*
   * PRUEBA VISUAL · tickets solo para Fábrica. Usa la selección existente;
   * sin selección u otra carta el atributo no se emite y el look oscuro
   * permanece. La baraja no consulta este valor.
   */
  const ticketTheme =
    selectedCoordinationCode === FABRICA_CONTENIDOS_CODE ? 'fabrica' : undefined
  const fabricaTicket = ticketTheme === 'fabrica'

  return (
    <div
      className="operational-shell"
      data-testid="operational-shell"
      data-tour="operational-shell"
      data-ticket-theme={ticketTheme}
    >
      {/*
        ESCENARIO CIRCENSE (fase 1).

        Capa decorativa detrás de regiones y baraja. No participa del grid, no
        captura puntero y no aporta scroll: solo pinta el arte del teatro para
        que el suelo de madera ancle la mesa y los telones den profundidad a
        los paneles. La geometría del shell y las interacciones no cambian.
      */}
      <div
        className="operational-shell__scene"
        data-testid="shell-circus-scene"
        aria-hidden="true"
      >
        <img
          className="operational-shell__scene-image"
          src="/assets/scenes/circus-stage-background.png"
          alt=""
          decoding="async"
          draggable={false}
        />
      </div>

      <div className="operational-shell__main" data-testid="shell-main">
        <div className="operational-shell__top" data-testid="shell-top">
          {/* ---------- PERSONAJE: misma posición ---------- */}
          <ShellRegion
            region="character"
            title="Estado de la Dirección de Operaciones"
            className="operational-shell__region--character"
            showTitle={false}
          >
            {fabricaTicket ? <TicketFabricaDecor /> : null}
            <DirectionCharacter
              presentation={characterPresentation}
              mood={characterMood}
              reactionId={reaccionVisible ? pending.id : null}
              /* El significado lo decide el estado; aquí solo se pasa. */
              reactionTrigger={pending?.trigger ?? 'approve'}
              onReactionPlayed={controller.consumeCharacterReaction}
            />
            <p
              className="operational-shell__summary"
              data-testid="direction-summary"
              aria-live="polite"
            >
              {summary}
            </p>
            {/*
              QUÉ ESTÁ MIRANDO EL PERSONAJE.

              Su cara sigue a la coordinación observada mientras el rótulo de
              arriba sigue al estado institucional. Son dos fuentes distintas y
              a la vez correctas, pero sin decirlo la escena parecía
              contradecirse: cara triste bajo un rótulo que decía «Estable».
              Esta línea nombra la fuente de la expresión y solo aparece cuando
              hay algo observado; sin selección la única lectura es la de la
              Dirección y no hay ambigüedad que resolver.
            */}
            {selectedCoordination && (
              <p
                className="operational-shell__observing"
                data-testid="character-observing"
                data-status={selectedCoordination.status}
              >
                <span className="operational-shell__observing-label">
                  Observando
                </span>
                <span className="operational-shell__observing-name">
                  {labelByCode[selectedCoordination.code] ??
                    selectedCoordination.shortName}
                </span>
                <span className="operational-shell__observing-status">
                  {OPERATIONAL_STATUS_LABEL[selectedCoordination.status]}
                </span>
              </p>
            )}
          </ShellRegion>

          {/* ---------- MIS REPORTES ---------- */}
          <ShellRegion
            region="my-reports"
            title="Mis reportes"
            className="operational-shell__region--my-reports"
            showTitle={false}
          >
            {fabricaTicket ? <TicketFabricaDecor /> : null}
            <MyReportsPanel
              myReports={controller.myReports}
              selectedProblemId={controller.selectedProblemId}
              onSelect={(problemId, coordinationCode) =>
                controller.openMyReport(
                  problemId,
                  coordinationCode as CoordinationId | null,
                )
              }
              onReportProblem={controller.openReportForm}
              onLoadMore={controller.loadMoreMyReports}
            />
          </ShellRegion>

          {/* ---------- PROBLEMAS DE LA COORDINACIÓN ---------- */}
          <ShellRegion
            region="coordination-problems"
            title="Problemas de la coordinación"
            hint={
              selectedCoordination ? undefined : 'Seleccione una coordinación'
            }
            className={`operational-shell__region--coordination-problems${
              fabricaTicket ? ' operational-shell__region--ticket-pilot-fabrica' : ''
            }`}
            showTitle={!selectedCoordination}
          >
            {fabricaTicket ? <TicketFabricaProblemsPilot /> : null}
            {selectedCoordination && (
              <>
                <CoordinationProblemList
                  coordination={selectedCoordination}
                  identity={resolveCoordinationVisualIdentity(
                    selectedCoordination,
                  )}
                  productLabel={labelByCode[selectedCoordination.code]}
                  level1={controller.level1}
                  selectedProblemId={controller.selectedProblemId}
                  onProblemSelect={controller.selectProblem}
                  onRetry={controller.retryCoordinationProblems}
                />
              </>
            )}
          </ShellRegion>
        </div>

        {/* La baraja, con toda su lógica y su geometría intactas. */}
        <div
          className="operational-shell__stage"
          data-testid="shell-stage"
          data-tour="operational-deck"
        >
          <OperationalCardExperience controller={controller} />
        </div>
      </div>

      {/* ---------- PANEL DERECHO: reportar o resolver ---------- */}
      <ShellRegion
        region="action"
        title="Reportar o resolver"
        className="operational-shell__action"
        showTitle={false}
      >
        {fabricaTicket ? <TicketFabricaDecor /> : null}
        <OperationalActionPanel
          mode={controller.panelMode}
          hasCoordination={selectedCoordination !== null}
          level2={controller.level2}
          submission={controller.submission}
          learningDraft={learningDraft}
          onToggleSection={controller.toggleSection}
          onLearningChange={(value) => {
            if (!controller.selectedProblemId) return
            controller.setLearningDraft(controller.selectedProblemId, value)
          }}
          onResolve={() => {
            if (!controller.selectedProblemId) return
            void controller.submitResolution(
              controller.selectedProblemId,
              learningDraft,
            )
          }}
          onReportAnother={controller.openReportForm}
          onRetryDetail={() => {
            // Reintenta el MISMO problema: se cierra y se vuelve a seleccionar,
            // que es lo que devuelve LEVEL 2 a `idle` y relanza la petición.
            const id = controller.selectedProblemId
            if (!id) return
            controller.closeProblem()
            controller.selectProblem(id)
          }}
          reportForm={{
            coordinationLabel: selectedCoordination
              ? (labelByCode[selectedCoordination.code] ??
                selectedCoordination.shortName)
              : null,
            categories,
            categoriesError,
            draft,
            submission: controller.submission,
            maxOccurredAt: nowAsLocalInput(),
            /*
             * Se envía el borrador COMPLETO, no solo el campo tocado.
             *
             * El reducer, al no encontrar todavía un borrador para esta
             * coordinación, partía de `emptyReportDraft('')` y la primera
             * pulsación borraba la fecha que el formulario ya mostraba. El
             * campo quedaba vacío, la validación nativa impedía enviar y no
             * aparecía ningún mensaje: el botón simplemente no hacía nada.
             * `draft` de aquí arriba ya lleva la fecha por defecto, así que
             * fusionarlo entero conserva lo que el usuario ve.
             */
            onDraftChange: (patch) =>
              controller.setReportDraft(draftKey, { ...draft, ...patch }),
            onSubmit: () => {
              void controller.submitReport({
                draftKey,
                coordinationCode: selectedCoordinationCode,
                // El UUID sale de la fila de LEVEL 0 que ya está cargada.
                coordinationId: selectedCoordination?.id ?? null,
                draft,
              })
            },
          }}
        />
      </ShellRegion>

      <div className="operational-shell__bottom" data-testid="shell-bottom">
        <span className="operational-shell__bottom-label">Menú</span>
      </div>
    </div>
  )
}
