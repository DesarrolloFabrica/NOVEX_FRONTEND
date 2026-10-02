import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  ActiveSituationStatus,
  CoordinationProblem,
  OperationalCardsState,
  ReportDraft,
} from '@/modules/operational-cards/types/operational-cards.state'
import type { MyReportsPage } from '@/modules/operational-cards/types/my-reports.types'
import type {
  ProblemHistoryPage,
  ProblemHistoryPeriod,
} from '@/modules/operational-cards/types/problem-history.types'
import { defaultHistoryPeriod } from '@/modules/operational-cards/data/problemHistoryPeriod'
import type { SituationsListScope } from '@/modules/api/situations.api'
import {
  initialProblemSectionsState,
  type LazyProblemSectionId,
  type ProblemDetail,
  type ProblemSectionId,
} from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Reducer de la experiencia: LEVEL 0 (overview), selección, LEVEL 1
 * (problemas activos de la coordinación) y LEVEL 2 (detalle del problema en
 * la isla flotante, con sus secciones perezosas).
 *
 * Cada acción de LEVEL 1 y LEVEL 2 lleva la clave a la que pertenece, así que
 * una respuesta que llega tarde tras cambiar de carta o cerrar la isla se
 * descarta en vez de contaminar lo que el usuario tiene delante.
 *
 * Impacto e Inteligencia IA no aparecen entre las secciones perezosas: se
 * derivan del análisis que ya se carga al abrir la isla.
 */

export type OperationalCardsAction =
  | { type: 'LOAD_OVERVIEW' }
  | { type: 'LOAD_OVERVIEW_SUCCESS'; overview: OperationalOverview }
  | { type: 'LOAD_OVERVIEW_ERROR'; message: string }
  | { type: 'HOVER_COORDINATION'; code: CoordinationId | null }
  | { type: 'SELECT_COORDINATION'; code: CoordinationId }
  | { type: 'CLEAR_COORDINATION' }
  | { type: 'LOAD_PROBLEMS'; code: CoordinationId }
  | {
      type: 'LOAD_PROBLEMS_SUCCESS'
      code: CoordinationId
      problems: readonly CoordinationProblem[]
      /** Alcance con el que el SERVIDOR resolvió la lista. */
      scope: SituationsListScope
      /** Generación con la que se PIDIÓ. Si ya no es la vigente, se descarta. */
      generation: number
    }
  | { type: 'LOAD_PROBLEMS_ERROR'; code: CoordinationId; message: string }
  | {
      /** Vuelve a pedir LEVEL 1 de la coordinación observada tras un fallo. */
      type: 'RETRY_PROBLEMS'
    }
  | { type: 'SELECT_PROBLEM'; problemId: string }
  | { type: 'CLOSE_PROBLEM' }
  | { type: 'LOAD_DETAIL'; problemId: string }
  | {
      type: 'LOAD_DETAIL_SUCCESS'
      problemId: string
      detail: ProblemDetail
      generation: number
    }
  | { type: 'LOAD_DETAIL_ERROR'; problemId: string; message: string }
  | { type: 'TOGGLE_SECTION'; problemId: string; section: ProblemSectionId }
  | {
      type: 'LOAD_SECTION'
      problemId: string
      section: LazyProblemSectionId
    }
  | {
      type: 'LOAD_SECTION_SUCCESS'
      problemId: string
      section: LazyProblemSectionId
      items: readonly unknown[]
    }
  | {
      type: 'LOAD_SECTION_ERROR'
      problemId: string
      section: LazyProblemSectionId
      message: string
    }
  // ---- «Mis reportes» ----
  | { type: 'LOAD_MY_REPORTS'; page: number }
  | {
      type: 'LOAD_MY_REPORTS_SUCCESS'
      page: MyReportsPage
      generation: number
    }
  | { type: 'LOAD_MY_REPORTS_ERROR'; message: string }
  // ---- Historial de cerrados ----
  | { type: 'OPEN_HISTORY' }
  | { type: 'CLOSE_HISTORY' }
  | { type: 'SET_HISTORY_PERIOD'; period: ProblemHistoryPeriod }
  | {
      type: 'LOAD_HISTORY'
      page: number
      coordinationId: string | null
      period: ProblemHistoryPeriod
    }
  | {
      type: 'LOAD_HISTORY_SUCCESS'
      page: ProblemHistoryPage
      coordinationId: string | null
      period: ProblemHistoryPeriod
      generation: number
    }
  | { type: 'LOAD_HISTORY_ERROR'; message: string }
  // ---- Panel derecho ----
  | { type: 'OPEN_REPORT_FORM'; kind: 'INTERNAL' | 'INTER_COORDINATION' }
  | { type: 'CLOSE_REPORT_FORM' }
  | {
      /**
       * Abrir un problema DESDE «Mis reportes»: sincroniza la carta y abre el
       * detalle EN UNA SOLA acción. Es imprescindible que sea atómica; hacerlo
       * con SELECT_COORDINATION + SELECT_PROBLEM borraría el problema por el
       * camino, porque seleccionar coordinación limpia la selección de problema.
       *
       * `keepSelection` (vista COORDINADOR): abre el detalle SIN cambiar la
       * carta propia ni el LEVEL 1 de su área.
       */
      type: 'OPEN_MY_REPORT'
      problemId: string
      coordinationCode: CoordinationId | null
      keepSelection?: boolean
    }
  // ---- Borradores ----
  | { type: 'SET_REPORT_DRAFT'; key: string; draft: Partial<ReportDraft> }
  | { type: 'SET_LEARNING_DRAFT'; problemId: string; learning: string }
  // ---- Escrituras ----
  | { type: 'SUBMIT_REPORT'; targetKey: string }
  | {
      type: 'SUBMIT_REPORT_SUCCESS'
      targetKey: string
      /** Coordinación observada al enviar (reacción / invalidación local). */
      coordinationCode: CoordinationId | null
      /** Codes cuyas listas LEVEL 1 hay que invalidar (responsable + afectada). */
      invalidateCoordinationCodes: readonly (CoordinationId | null)[]
      problemId: string
    }
  | { type: 'SUBMIT_REPORT_ERROR'; message: string }
  | { type: 'SUBMIT_RESOLUTION'; problemId: string }
  | { type: 'SUBMIT_RESOLUTION_SUCCESS'; problemId: string; detail: ProblemDetail }
  | { type: 'SUBMIT_RESOLUTION_ERROR'; message: string }
  | {
      /**
       * El problema ya estaba resuelto (409). Refresca sin representar una
       * resolución del usuario.
       */
      type: 'SUBMIT_RESOLUTION_CONFLICT'
      problemId: string
      message: string
    }
  | { type: 'SUBMIT_STATUS_ADVANCE'; problemId: string }
  | {
      type: 'SUBMIT_STATUS_ADVANCE_SUCCESS'
      problemId: string
      detail: ProblemDetail
    }
  | { type: 'SUBMIT_STATUS_ADVANCE_ERROR'; message: string }
  | { type: 'CONSUME_CHARACTER_REACTION'; id: number }

export const initialOperationalCardsState: OperationalCardsState = {
  overview: null,
  level0: 'idle',
  errorMessage: null,
  selectedCoordinationCode: null,
  hoveredCoordinationCode: null,
  level1: {
    status: 'idle',
    coordinationCode: null,
    problems: [],
    errorMessage: null,
    // Sin lista todavía no hay restricción que declarar.
    scope: 'complete',
  },
  problemsByCoordination: {},
  selectedProblemId: null,
  level2: {
    status: 'idle',
    problemId: null,
    detail: null,
    errorMessage: null,
    sections: initialProblemSectionsState,
    expanded: [],
  },
  detailByProblem: {},
  myReports: {
    status: 'idle',
    items: [],
    total: 0,
    page: 0,
    loadingMore: false,
    errorMessage: null,
  },
  history: {
    status: 'idle',
    items: [],
    total: 0,
    page: 0,
    loadingMore: false,
    errorMessage: null,
    period: defaultHistoryPeriod(),
    coordinationId: null,
    scope: 'complete',
  },
  panelMode: 'idle',
  reportFormKind: null,
  detailReturnMode: 'idle',
  reportDrafts: {},
  learningDrafts: {},
  submission: {
    kind: null,
    status: 'idle',
    targetKey: null,
    errorMessage: null,
    confirmedButStale: false,
  },
  dataGeneration: 0,
  pendingCharacterReaction: null,
}

/** Borrador vacío. La severidad arranca en MEDIUM, visible y editable. */
export function emptyReportDraft(occurredAt: string): ReportDraft {
  return {
    title: '',
    description: '',
    categoryId: '',
    severity: 'MEDIUM',
    occurredAt,
    responsibleCoordinationId: '',
    internalDestinationCoordinationId: '',
    affectedProcess: '',
    pendingDelivery: '',
  }
}

export { reportDraftKey } from '@/modules/operational-cards/data/situationViewpoint'

/**
 * Un fallo NUNCA deja datos sintéticos: en LEVEL 0 se vacía el overview y el
 * estado queda en `error`, que la UI presenta como DESCONOCIDO; en LEVEL 1 la
 * coordinación sigue seleccionada y con su estado de LEVEL 0 intacto, pero la
 * lista no se convierte en «Todo bajo control».
 *
 * Toda acción de LEVEL 1 lleva el `code` al que pertenece, de modo que una
 * respuesta que llega tarde tras cambiar de coordinación se descarta en vez de
 * pisar la selección vigente.
 */
export function operationalCardsReducer(
  state: OperationalCardsState,
  action: OperationalCardsAction,
): OperationalCardsState {
  switch (action.type) {
    case 'LOAD_OVERVIEW':
      return { ...state, level0: 'loading', errorMessage: null }

    case 'LOAD_OVERVIEW_SUCCESS':
      return {
        ...state,
        level0: 'ready',
        overview: action.overview,
        errorMessage: null,
      }

    case 'LOAD_OVERVIEW_ERROR':
      return {
        ...state,
        level0: 'error',
        overview: null,
        errorMessage: action.message,
        selectedCoordinationCode: null,
        level1: initialOperationalCardsState.level1,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
      }

    case 'HOVER_COORDINATION':
      return { ...state, hoveredCoordinationCode: action.code }

    case 'SELECT_COORDINATION': {
      if (state.selectedCoordinationCode === action.code) return state

      // Cambio directo entre coordinaciones: si la nueva ya está en caché se
      // entra en `ready` sin pasar por un parpadeo de carga.
      const cached = state.problemsByCoordination[action.code]
      return {
        ...state,
        selectedCoordinationCode: action.code,
        // La carta que tenía el hover se desmonta al recomponerse la baraja y
        // no emite `mouseleave`: sin limpiarlo queda un hover fantasma.
        hoveredCoordinationCode: null,
        // Cambiar de carta cierra el detalle: el problema abierto pertenecía a
        // la coordinación anterior y dejarlo a la vista lo presentaría como si
        // fuera de la nueva. El panel vuelve a su indicación de reposo; NO se
        // abre el formulario, que es una decisión del usuario.
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        panelMode: 'idle',
        reportFormKind: null,
        detailReturnMode: 'idle',
        level1: cached
          ? {
              status: 'ready',
              coordinationCode: action.code,
              problems: cached.problems,
              errorMessage: null,
              scope: cached.scope,
            }
          : {
              status: 'idle',
              coordinationCode: action.code,
              problems: [],
              errorMessage: null,
              scope: 'complete',
            },
      }
    }

    case 'CLEAR_COORDINATION':
      // Volver a la Dirección cierra también la isla: no puede quedar un
      // detalle abierto sin coordinación debajo.
      //
      // El hover se limpia porque la carta que lo tenía se desmonta al
      // recomponerse la baraja y ya no emite `mouseleave`: sin esto el
      // personaje seguiría reaccionando a una carta que no existe.
      return {
        ...state,
        selectedCoordinationCode: null,
        hoveredCoordinationCode: null,
        level1: initialOperationalCardsState.level1,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        panelMode: 'idle',
        reportFormKind: null,
        detailReturnMode: 'idle',
      }

    case 'LOAD_PROBLEMS':
      if (state.selectedCoordinationCode !== action.code) return state
      return {
        ...state,
        level1: {
          status: 'loading',
          coordinationCode: action.code,
          problems: [],
          errorMessage: null,
          scope: 'complete',
        },
      }

    case 'LOAD_PROBLEMS_SUCCESS': {
      /*
       * RESPUESTA ANTIGUA. Si entre la petición y su vuelta hubo una escritura
       * confirmada, estos problemas describen el estado ANTERIOR a ella y
       * reintroducirlos borraría de la lista el problema recién creado o
       * devolvería el recién resuelto. Se descarta sin tocar nada: el efecto
       * volverá a pedirla con la generación vigente.
       */
      if (action.generation !== state.dataGeneration) return state

      // La caché se puebla siempre: el trabajo ya está hecho aunque el usuario
      // haya cambiado de carta mientras la petición volvía.
      const problemsByCoordination = {
        ...state.problemsByCoordination,
        [action.code]: { problems: action.problems, scope: action.scope },
      }

      if (state.selectedCoordinationCode !== action.code) {
        return { ...state, problemsByCoordination }
      }

      return {
        ...state,
        problemsByCoordination,
        level1: {
          status: 'ready',
          coordinationCode: action.code,
          problems: action.problems,
          errorMessage: null,
          scope: action.scope,
        },
      }
    }

    case 'LOAD_PROBLEMS_ERROR':
      if (state.selectedCoordinationCode !== action.code) return state
      return {
        ...state,
        level1: {
          status: 'error',
          coordinationCode: action.code,
          problems: [],
          errorMessage: action.message,
          scope: 'complete',
        },
      }

    case 'RETRY_PROBLEMS': {
      /*
       * Devuelve LEVEL 1 a `idle`, que es la condición que hace al efecto
       * volver a pedirlo. Solo tiene sentido tras un fallo: reintentar una
       * lista que ya está cargada solo costaría peticiones.
       */
      if (state.level1.status !== 'error' || !state.selectedCoordinationCode) {
        return state
      }
      return {
        ...state,
        level1: {
          status: 'idle',
          coordinationCode: state.selectedCoordinationCode,
          problems: [],
          errorMessage: null,
          scope: 'complete',
        },
      }
    }

    case 'SELECT_PROBLEM': {
      // Cambio DIRECTO de problema. Mientras el detalle era una isla flotante,
      // una segunda fila no podía abrir otra encima y la selección se
      // ignoraba; ahora el detalle es una región permanente y elegir otro
      // problema es, simplemente, mirar otro problema. Volver a pulsar el que
      // ya se está mirando no recarga nada.
      // Volver a pulsar el problema que ya se mira no recarga, pero sí
      // devuelve el panel al detalle si estaba en el formulario.
      const returnMode =
        state.panelMode === 'history' || state.detailReturnMode === 'history'
          ? 'history'
          : 'idle'

      if (state.selectedProblemId === action.problemId) {
        return state.panelMode === 'detail'
          ? state
          : {
              ...state,
              panelMode: 'detail',
              reportFormKind: null,
              detailReturnMode: returnMode,
            }
      }

      const cached = state.detailByProblem[action.problemId]
      return {
        ...state,
        selectedProblemId: action.problemId,
        panelMode: 'detail',
        reportFormKind: null,
        detailReturnMode: returnMode,
        level2: cached
          ? {
              status: 'ready',
              problemId: action.problemId,
              detail: cached.detail,
              errorMessage: null,
              sections: cached.sections,
              expanded: [],
            }
          : {
              status: 'idle',
              problemId: action.problemId,
              detail: null,
              errorMessage: null,
              sections: initialProblemSectionsState,
              expanded: [],
            },
      }
    }

    case 'CLOSE_PROBLEM': {
      // La coordinación sigue seleccionada: cerrar el detalle no retrocede nivel.
      // Si el expediente vino del historial, se restaura esa vista (periodo intacto).
      const backToHistory = state.detailReturnMode === 'history'
      return {
        ...state,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        panelMode: backToHistory ? 'history' : 'idle',
        detailReturnMode: 'idle',
      }
    }

    case 'LOAD_DETAIL':
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: { ...state.level2, status: 'loading', errorMessage: null },
      }

    case 'LOAD_DETAIL_SUCCESS': {
      // Mismo motivo que en LEVEL 1: un detalle pedido antes de resolver
      // reintroduciría el problema como si siguiera activo.
      if (action.generation !== state.dataGeneration) return state

      const detailByProblem = {
        ...state.detailByProblem,
        [action.problemId]: {
          detail: action.detail,
          sections:
            state.detailByProblem[action.problemId]?.sections ??
            initialProblemSectionsState,
        },
      }

      if (state.selectedProblemId !== action.problemId) {
        return { ...state, detailByProblem }
      }

      return {
        ...state,
        detailByProblem,
        level2: {
          ...state.level2,
          status: 'ready',
          detail: action.detail,
          errorMessage: null,
        },
      }
    }

    case 'LOAD_DETAIL_ERROR':
      // La isla queda abierta con su mensaje: no se cierra sola, no toca
      // LEVEL 1 y no altera el estado del problema.
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          status: 'error',
          detail: null,
          errorMessage: action.message,
        },
      }

    case 'TOGGLE_SECTION': {
      if (state.selectedProblemId !== action.problemId) return state
      const isOpen = state.level2.expanded.includes(action.section)
      return {
        ...state,
        level2: {
          ...state.level2,
          expanded: isOpen
            ? state.level2.expanded.filter(
                (section) => section !== action.section,
              )
            : [...state.level2.expanded, action.section],
        },
      }
    }

    case 'LOAD_SECTION':
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          sections: {
            ...state.level2.sections,
            [action.section]: {
              status: 'loading',
              items: [],
              errorMessage: null,
            },
          },
        },
      }

    case 'LOAD_SECTION_SUCCESS': {
      const loaded = {
        status: 'ready' as const,
        items: action.items,
        errorMessage: null,
      }
      const cachedEntry = state.detailByProblem[action.problemId]
      const detailByProblem = cachedEntry
        ? {
            ...state.detailByProblem,
            [action.problemId]: {
              ...cachedEntry,
              sections: { ...cachedEntry.sections, [action.section]: loaded },
            },
          }
        : state.detailByProblem

      if (state.selectedProblemId !== action.problemId) {
        return { ...state, detailByProblem }
      }

      return {
        ...state,
        detailByProblem,
        level2: {
          ...state.level2,
          sections: { ...state.level2.sections, [action.section]: loaded },
        },
      }
    }

    case 'LOAD_SECTION_ERROR':
      // Solo esa sección falla: la isla sigue utilizable y las demás también.
      if (state.selectedProblemId !== action.problemId) return state
      return {
        ...state,
        level2: {
          ...state.level2,
          sections: {
            ...state.level2.sections,
            [action.section]: {
              status: 'error',
              items: [],
              errorMessage: action.message,
            },
          },
        },
      }

    // ================= «MIS REPORTES» =================

    case 'LOAD_MY_REPORTS':
      return {
        ...state,
        myReports: {
          ...state.myReports,
          // Primera página: carga completa. Siguientes: carga incremental que
          // no vacía lo que el usuario ya tiene delante.
          status: action.page <= 1 ? 'loading' : state.myReports.status,
          loadingMore: action.page > 1,
          errorMessage: null,
        },
      }

    case 'LOAD_MY_REPORTS_SUCCESS': {
      // Respuesta anterior a una escritura confirmada: describiría la lista sin
      // el reporte recién creado.
      if (action.generation !== state.dataGeneration) return state

      const { items, total, page } = action.page
      return {
        ...state,
        myReports: {
          status: 'ready',
          // Página 1 reemplaza; las siguientes acumulan.
          items: page <= 1 ? items : [...state.myReports.items, ...items],
          total,
          page,
          loadingMore: false,
          errorMessage: null,
        },
      }
    }

    case 'LOAD_MY_REPORTS_ERROR':
      return {
        ...state,
        myReports: {
          ...state.myReports,
          status: state.myReports.items.length > 0 ? 'ready' : 'error',
          loadingMore: false,
          errorMessage: action.message,
        },
      }

    case 'OPEN_HISTORY':
      return {
        ...state,
        panelMode: 'history',
        reportFormKind: null,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        detailReturnMode: 'idle',
        history: {
          ...state.history,
          // Fuerza recarga con la coordinación actual al entrar desde idle.
          status: 'idle',
          items: [],
          total: 0,
          page: 0,
          loadingMore: false,
          errorMessage: null,
        },
      }

    case 'CLOSE_HISTORY':
      return {
        ...state,
        panelMode: 'idle',
        detailReturnMode: 'idle',
      }

    case 'SET_HISTORY_PERIOD':
      return {
        ...state,
        history: {
          ...state.history,
          period: action.period,
          status: 'idle',
          items: [],
          total: 0,
          page: 0,
          loadingMore: false,
          errorMessage: null,
        },
      }

    case 'LOAD_HISTORY':
      return {
        ...state,
        history: {
          ...state.history,
          status: action.page <= 1 ? 'loading' : state.history.status,
          loadingMore: action.page > 1,
          errorMessage: null,
          period: action.period,
          coordinationId: action.coordinationId,
        },
      }

    case 'LOAD_HISTORY_SUCCESS': {
      if (action.generation !== state.dataGeneration) return state
      if (state.panelMode !== 'history' && state.detailReturnMode !== 'history') {
        // Llegó fuera de contexto: no pisa idle/report.
        if (state.panelMode !== 'detail') return state
      }
      const { items, total, page, scope } = action.page
      return {
        ...state,
        history: {
          status: 'ready',
          items: page <= 1 ? items : [...state.history.items, ...items],
          total,
          page,
          loadingMore: false,
          errorMessage: null,
          period: action.period,
          coordinationId: action.coordinationId,
          scope,
        },
      }
    }

    case 'LOAD_HISTORY_ERROR':
      return {
        ...state,
        history: {
          ...state.history,
          status: state.history.items.length > 0 ? 'ready' : 'error',
          loadingMore: false,
          errorMessage: action.message,
        },
      }

    // ================= PANEL DERECHO =================

    case 'OPEN_REPORT_FORM':
      /*
       * Salir del detalle hacia el formulario. La SELECCIÓN DE PROBLEMA se
       * limpia a propósito: si se conservara, la lista central seguiría
       * marcando una fila como activa mientras el panel habla de otra cosa.
       * La coordinación, en cambio, se conserva: es el contexto del reporte.
       */
      return {
        ...state,
        panelMode: 'report',
        reportFormKind: action.kind,
        selectedProblemId: null,
        level2: initialOperationalCardsState.level2,
        detailReturnMode: 'idle',
        // Un error de envío anterior no debe recibir al usuario en el formulario.
        submission:
          state.submission.status === 'error'
            ? initialOperationalCardsState.submission
            : state.submission,
      }

    case 'CLOSE_REPORT_FORM':
      // Vuelve a idle sin tocar la coordinación ni los borradores.
      return {
        ...state,
        panelMode: 'idle',
        reportFormKind: null,
        detailReturnMode: 'idle',
        submission:
          state.submission.status === 'error'
            ? initialOperationalCardsState.submission
            : state.submission,
      }

    case 'OPEN_MY_REPORT': {
      /*
       * ACCIÓN ATÓMICA. Sincroniza la carta y abre el detalle a la vez.
       *
       * El orden importa: despachar SELECT_COORDINATION y después
       * SELECT_PROBLEM dejaría en medio un estado con el problema borrado, y
       * el efecto de LEVEL 2 podría no volver a dispararse. Por eso ambas
       * cosas ocurren en una sola transición.
       *
       * `coordinationCode` puede ser null —un reporte histórico sin área— o
       * apuntar a una coordinación que ya no está en el catálogo. En ambos
       * casos se abre el detalle SIN tocar la selección de cartas: no se
       * inventa una carta ni se atribuye el reporte a otra área.
       *
       * Con `keepSelection` (COORDINADOR) nunca se cambia la carta ni LEVEL 1:
       * el detalle puede ser de otra área sin desplazar el personaje.
       */
      const code = action.coordinationCode
      const cambiaCoordinacion =
        !action.keepSelection &&
        code !== null &&
        code !== state.selectedCoordinationCode

      const cachedProblems = cambiaCoordinacion
        ? state.problemsByCoordination[code]
        : null

      const cachedDetail = state.detailByProblem[action.problemId]

      return {
        ...state,
        selectedCoordinationCode: cambiaCoordinacion
          ? code
          : state.selectedCoordinationCode,
        hoveredCoordinationCode: null,
        level1: cambiaCoordinacion
          ? cachedProblems
            ? {
                status: 'ready',
                coordinationCode: code,
                problems: cachedProblems.problems,
                errorMessage: null,
                scope: cachedProblems.scope,
              }
            : {
                status: 'idle',
                coordinationCode: code,
                problems: [],
                errorMessage: null,
                scope: 'complete',
              }
          : state.level1,
        // El problema SOBREVIVE a la sincronización de coordinación.
        selectedProblemId: action.problemId,
        panelMode: 'detail',
        reportFormKind: null,
        detailReturnMode: 'idle',
        level2: cachedDetail
          ? {
              status: 'ready',
              problemId: action.problemId,
              detail: cachedDetail.detail,
              errorMessage: null,
              sections: cachedDetail.sections,
              expanded: [],
            }
          : {
              status: 'idle',
              problemId: action.problemId,
              detail: null,
              errorMessage: null,
              sections: initialProblemSectionsState,
              expanded: [],
            },
      }
    }

    // ================= BORRADORES =================

    case 'SET_REPORT_DRAFT': {
      // El borrador se guarda BAJO SU CLAVE de coordinación: cambiar de carta
      // no lo pierde ni lo traslada a otra área.
      const actual =
        state.reportDrafts[action.key] ?? emptyReportDraft('')
      return {
        ...state,
        reportDrafts: {
          ...state.reportDrafts,
          [action.key]: { ...actual, ...action.draft },
        },
      }
    }

    case 'SET_LEARNING_DRAFT':
      return {
        ...state,
        learningDrafts: {
          ...state.learningDrafts,
          [action.problemId]: action.learning,
        },
      }

    // ================= ESCRITURAS =================

    case 'SUBMIT_REPORT':
      // Solo una operación viva a la vez: es lo que impide el envío duplicado.
      if (state.submission.status === 'sending') return state
      return {
        ...state,
        submission: {
          kind: 'report',
          status: 'sending',
          targetKey: action.targetKey,
          errorMessage: null,
          confirmedButStale: false,
        },
      }

    case 'SUBMIT_REPORT_SUCCESS': {
      /*
       * REGISTRO CONFIRMADO POR EL SERVIDOR. Solo aquí se da por buena la
       * operación, nunca antes de la respuesta.
       *
       * Se invalidan las coordinaciones de DESTINO (responsable y, en INTER,
       * también la afectada), capturadas al enviar. El borrador de esa clave
       * se descarta; el de cualquier otra sigue intacto.
       */
      const generation = state.dataGeneration + 1
      const code = action.coordinationCode

      const { [action.targetKey]: _consumido, ...draftsRestantes } =
        state.reportDrafts

      const invalidate = new Set(
        action.invalidateCoordinationCodes.filter(
          (item): item is CoordinationId => Boolean(item),
        ),
      )

      const problemsByCoordination = Object.fromEntries(
        Object.entries(state.problemsByCoordination).filter(
          ([key]) => !invalidate.has(key as CoordinationId),
        ),
      )

      // Si el usuario sigue en una de las coordinaciones invalidadas, recarga.
      const recargaLista =
        state.selectedCoordinationCode !== null &&
        invalidate.has(state.selectedCoordinationCode)

      return {
        ...state,
        dataGeneration: generation,
        problemsByCoordination,
        level1: recargaLista
          ? {
              status: 'idle',
              coordinationCode: state.selectedCoordinationCode,
              problems: [],
              errorMessage: null,
              scope: state.level1.scope,
            }
          : state.level1,
        reportDrafts: draftsRestantes,
        myReports: { ...state.myReports, status: 'idle', page: 0 },
        submission: initialOperationalCardsState.submission,
        /*
         * El detalle del problema creado se abre SOLO si el usuario sigue en el
         * mismo contexto. Si ya cambió de carta, no se le devuelve por la
         * fuerza a la selección anterior ni se le pisa el formulario que está
         * usando: sus datos se actualizan igual, en segundo plano.
         */
        selectedProblemId: recargaLista ? action.problemId : state.selectedProblemId,
        panelMode: recargaLista ? 'detail' : state.panelMode,
        reportFormKind: recargaLista ? null : state.reportFormKind,
        level2: recargaLista
          ? {
              status: 'idle',
              problemId: action.problemId,
              detail: null,
              errorMessage: null,
              sections: initialProblemSectionsState,
              expanded: [],
            }
          : state.level2,
        /*
         * MALESTAR por el problema que acaba de aparecer. No es una celebración
         * del registro: lo que se representa es el hecho, no el trámite. Se pide
         * SOLO aquí, con la respuesta del servidor ya en la mano.
         */
        pendingCharacterReaction: {
          id: generation,
          kind: 'report-confirmed',
          trigger: 'disapprove',
          coordinationCode: code,
        },
      }
    }

    case 'SUBMIT_REPORT_ERROR':
      // El borrador NO se toca: el texto escrito sobrevive al fallo.
      return {
        ...state,
        submission: {
          kind: 'report',
          status: 'error',
          targetKey: state.submission.targetKey,
          errorMessage: action.message,
          confirmedButStale: false,
        },
      }

    case 'SUBMIT_RESOLUTION':
      if (state.submission.status === 'sending') return state
      return {
        ...state,
        submission: {
          kind: 'resolution',
          status: 'sending',
          targetKey: action.problemId,
          errorMessage: null,
          confirmedButStale: false,
        },
      }

    case 'SUBMIT_RESOLUTION_SUCCESS': {
      /*
       * RESOLUCIÓN CONFIRMADA. El detalle se CONSERVA y se sustituye por el que
       * devuelve el servidor, ya cerrado y con su aprendizaje: el problema
       * desaparecerá de la lista de activos, pero el usuario debe seguir viendo
       * el resultado de lo que acaba de hacer.
       *
       * La coordinación afectada se invalida para que su lista deje de
       * incluirlo, y «Mis reportes» también, porque el estado cambió.
       */
      const generation = state.dataGeneration + 1
      /*
       * La coordinación del HECHO sale del detalle que devuelve el servidor, no
       * de la que el usuario esté observando ahora: si cambió de carta mientras
       * la petición viajaba, lo que hay que invalidar —y a quién se atribuye la
       * reacción— sigue siendo el área responsable del problema resuelto.
       */
      const code = action.detail.coordinationCode as CoordinationId | null

      const { [action.problemId]: _aprendizajeConsumido, ...aprendizajes } =
        state.learningDrafts

      const problemsByCoordination = Object.fromEntries(
        Object.entries(state.problemsByCoordination).filter(
          ([key]) => key !== code,
        ),
      )

      const detalleActualizado = {
        detail: action.detail,
        sections:
          state.detailByProblem[action.problemId]?.sections ??
          initialProblemSectionsState,
      }

      return {
        ...state,
        dataGeneration: generation,
        problemsByCoordination,
        level1:
          code !== null
            ? {
                status: 'idle',
                coordinationCode: code,
                problems: [],
                errorMessage: null,
                scope: state.level1.scope,
              }
            : state.level1,
        detailByProblem: {
          ...state.detailByProblem,
          [action.problemId]: detalleActualizado,
        },
        level2:
          state.selectedProblemId === action.problemId
            ? {
                ...state.level2,
                status: 'ready',
                detail: action.detail,
                errorMessage: null,
              }
            : state.level2,
        learningDrafts: aprendizajes,
        myReports: { ...state.myReports, status: 'idle', page: 0 },
        submission: initialOperationalCardsState.submission,
        /*
         * ALIVIO por el problema resuelto. Es la única vía por la que se pide
         * esta reacción, y solo tras confirmar el cierre CON su aprendizaje ya
         * persistido: el servidor devuelve el detalle cerrado y con la
         * resolución dentro.
         */
        pendingCharacterReaction: {
          id: generation,
          kind: 'resolution-confirmed',
          trigger: 'approve',
          coordinationCode: code,
        },
      }
    }

    case 'SUBMIT_RESOLUTION_CONFLICT': {
      /*
       * 409: el problema YA estaba resuelto cuando llegó esta petición, casi
       * siempre porque otra persona se adelantó.
       *
       * Se actualiza lo que corresponde —la lista del área, «Mis reportes» y el
       * detalle, que hay que volver a leer para mostrar el cierre real y su
       * aprendizaje ajeno— PERO no se pide ninguna reacción: quien está delante
       * no ha resuelto nada, y representar alivio por el trabajo de otro sería
       * atribuirle una acción que no hizo.
       *
       * El borrador de aprendizaje SÍ se conserva: puede querer copiarlo a otro
       * sitio antes de descartarlo.
       */
      const generation = state.dataGeneration + 1
      const code = state.level1.coordinationCode

      const problemsByCoordination = Object.fromEntries(
        Object.entries(state.problemsByCoordination).filter(
          ([key]) => key !== code,
        ),
      )

      const { [action.problemId]: _detalleObsoleto, ...detalleRestante } =
        state.detailByProblem

      return {
        ...state,
        dataGeneration: generation,
        problemsByCoordination,
        level1:
          code !== null
            ? {
                status: 'idle',
                coordinationCode: code,
                problems: [],
                errorMessage: null,
                scope: state.level1.scope,
              }
            : state.level1,
        detailByProblem: detalleRestante,
        // El detalle vuelve a pedirse para mostrar el cierre REAL.
        level2:
          state.selectedProblemId === action.problemId
            ? {
                ...initialOperationalCardsState.level2,
                status: 'idle',
                problemId: action.problemId,
              }
            : state.level2,
        myReports: { ...state.myReports, status: 'idle', page: 0 },
        submission: {
          kind: 'resolution',
          status: 'error',
          targetKey: action.problemId,
          errorMessage: action.message,
          /*
           * El registro que el usuario quería NO es suyo, pero el problema sí
           * quedó cerrado: no se le invita a reintentar como si hubiera fallado.
           */
          confirmedButStale: true,
        },
        pendingCharacterReaction: null,
      }
    }

    case 'SUBMIT_RESOLUTION_ERROR':
      // El aprendizaje escrito NO se pierde.
      return {
        ...state,
        submission: {
          kind: 'resolution',
          status: 'error',
          targetKey: state.submission.targetKey,
          errorMessage: action.message,
          confirmedButStale: false,
        },
      }

    case 'SUBMIT_STATUS_ADVANCE':
      if (state.submission.status === 'sending') return state
      return {
        ...state,
        submission: {
          kind: 'status-advance',
          status: 'sending',
          targetKey: action.problemId,
          errorMessage: null,
          confirmedButStale: false,
        },
      }

    case 'SUBMIT_STATUS_ADVANCE_SUCCESS': {
      /*
       * OPEN → IN_PROGRESS. El problema SIGUE activo: se actualiza el estado en
       * detalle, listas y Mis reportes sin sacarlo ni pedir reacción del
       * personaje (no es un cierre). La integridad agregada no cambia.
       */
      const nextStatus = action.detail.status
      const activeStatus: ActiveSituationStatus | null =
        nextStatus === 'OPEN' || nextStatus === 'IN_PROGRESS'
          ? nextStatus
          : null

      const patchProblem = (
        problem: CoordinationProblem,
      ): CoordinationProblem =>
        problem.id === action.problemId && activeStatus
          ? { ...problem, status: activeStatus }
          : problem

      // El caché es `Partial`: una entrada ausente no se fabrica, y la que
      // existe conserva su `scope` intacto.
      const problemsByCoordination = Object.fromEntries(
        Object.entries(state.problemsByCoordination).flatMap(([code, cached]) =>
          cached
            ? [
                [
                  code,
                  {
                    problems: cached.problems.map(patchProblem),
                    scope: cached.scope,
                  },
                ] as const,
              ]
            : [],
        ),
      )

      const previousSections =
        state.detailByProblem[action.problemId]?.sections ??
        state.level2.sections
      const sections = {
        ...previousSections,
        // El timeline gana un evento de cambio de estado: se vuelve a pedir.
        timeline: {
          status: 'idle' as const,
          items: [],
          errorMessage: null,
        },
      }

      const detalleActualizado = {
        detail: action.detail,
        sections,
      }

      return {
        ...state,
        problemsByCoordination,
        level1: {
          ...state.level1,
          problems: state.level1.problems.map(patchProblem),
        },
        detailByProblem: {
          ...state.detailByProblem,
          [action.problemId]: detalleActualizado,
        },
        level2:
          state.selectedProblemId === action.problemId
            ? {
                ...state.level2,
                status: 'ready',
                detail: action.detail,
                sections,
                errorMessage: null,
              }
            : state.level2,
        myReports: {
          ...state.myReports,
          items: state.myReports.items.map((item) =>
            item.id === action.problemId
              ? {
                  ...item,
                  status: action.detail.status,
                  canResolve: action.detail.canResolve,
                }
              : item,
          ),
        },
        submission: initialOperationalCardsState.submission,
        pendingCharacterReaction: null,
      }
    }

    case 'SUBMIT_STATUS_ADVANCE_ERROR':
      return {
        ...state,
        submission: {
          kind: 'status-advance',
          status: 'error',
          targetKey: state.submission.targetKey,
          errorMessage: action.message,
          confirmedButStale: false,
        },
      }

    case 'CONSUME_CHARACTER_REACTION':
      // El personaje avisa de que ya la representó. Sin esto, un remontaje o un
      // refresco volverían a dispararla.
      if (state.pendingCharacterReaction?.id !== action.id) return state
      return { ...state, pendingCharacterReaction: null }

    default:
      return state
  }
}
