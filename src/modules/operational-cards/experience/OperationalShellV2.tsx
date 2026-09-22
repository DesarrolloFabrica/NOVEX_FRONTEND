import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CoordinationProblemList } from '@/modules/operational-cards/components/CoordinationProblemList'
import { DirectionCharacter } from '@/modules/operational-cards/components/DirectionCharacter'
import { MyReportsPanel } from '@/modules/operational-cards/components/MyReportsPanel'
import { OperationalActionPanel } from '@/modules/operational-cards/components/OperationalActionPanel'
import { resolveCharacterMood } from '@/modules/operational-cards/data/characterMood'
import { buildCharacterPresentation } from '@/modules/operational-cards/data/characterReaction'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { buildProductTable } from '@/modules/operational-cards/data/productHierarchy'
import { buildTableLayout } from '@/modules/operational-cards/data/tableLayout'
import { OperationalCardExperience } from '@/modules/operational-cards/experience/OperationalCardExperience'
import {
  TicketPanelFrame,
  type TicketPanelVariant,
} from '@/modules/operational-cards/experience/TicketPanelFrame'
import {
  resolveTicketTheme,
  type TicketThemeId,
} from '@/modules/operational-cards/experience/ticketThemes'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import {
  emptyReportDraft,
  reportDraftKey,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import { nowAsLocalInput } from '@/modules/operational-cards/services/report-submission.service'
import { fetchIncidentCategories } from '@/modules/api/situations.api'
import { getErrorMessage } from '@/shared/utils/error'
import type { IncidentCategorySummary } from '@/modules/situations/types/situation.types'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'

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
  ticketTheme,
  ticketPanel,
  children,
}: {
  region: string
  title: string
  hint?: string
  className?: string
  showTitle?: boolean
  /** Tema ticket activo; sin él no se monta el marco. */
  ticketTheme?: TicketThemeId
  /** Variante de panel (character|reports|problems|action). */
  ticketPanel?: TicketPanelVariant
  children?: ReactNode
}) {
  return (
    <section
      className={`operational-shell__region ${className}`.trim()}
      data-testid={`shell-region-${region}`}
      data-region={region}
      aria-label={title}
    >
      {ticketTheme && ticketPanel ? (
        <TicketPanelFrame themeId={ticketTheme} variant={ticketPanel} />
      ) : null}
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
    selectedStatus: selectedCoordination?.status ?? null,
    orientation:
      (selectedCoordinationCode
        ? orientationByCode[selectedCoordinationCode]
        : hoveredCoordinationCode
          ? orientationByCode[hoveredCoordinationCode]
          : null) ?? 'NEUTRAL',
    hovering: Boolean(hoveredCoordinationCode),
    selecting: Boolean(selectedCoordinationCode),
  })

  /** La cara acompaña a lo observado; con selección, el rótulo también. */
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

  // ---------- Panel derecho ----------

  const draftKey = reportDraftKey(selectedCoordinationCode)
  const draft =
    controller.reportDrafts[draftKey] ?? emptyReportDraft(nowAsLocalInput())

  const learningDraft = controller.selectedProblemId
    ? (controller.learningDrafts[controller.selectedProblemId] ?? '')
    : ''

  /*
   * Temas ticket (fase 4): Fábrica y Saber Pro vía resolveTicketTheme.
   * Sin selección o code no registrado → atributo ausente, look oscuro.
   * La baraja no consulta este valor; al cambiar de carta se limpia solo.
   */
  const ticketTheme = resolveTicketTheme(selectedCoordinationCode)
  const ticketRegionClass = ticketTheme
    ? ' operational-shell__region--ticket-panel'
    : ''

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
            title="Estado del personaje"
            className={`operational-shell__region--character${
              ticketRegionClass
            }`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'character' : undefined}
          >
            <DirectionCharacter
              presentation={characterPresentation}
              mood={characterMood}
              reactionId={reaccionVisible ? pending.id : null}
              /* El significado lo decide el estado; aquí solo se pasa. */
              reactionTrigger={pending?.trigger ?? 'approve'}
              onReactionPlayed={controller.consumeCharacterReaction}
            />
          </ShellRegion>

          {/* ---------- MIS REPORTES ---------- */}
          <ShellRegion
            region="my-reports"
            title="Mis reportes"
            className={`operational-shell__region--my-reports${
              ticketRegionClass
            }`}
            showTitle={false}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'reports' : undefined}
          >
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
              ticketRegionClass
            }`}
            showTitle={!selectedCoordination}
            ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'problems' : undefined}
          >
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
        className={`operational-shell__action${
          ticketRegionClass
        }`}
        showTitle={false}
        ticketTheme={ticketTheme}
            ticketPanel={ticketTheme ? 'action' : undefined}
      >
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
