import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  ProblemDetail,
  ProblemSectionId,
  ProblemSectionsState,
} from '@/modules/operational-cards/types/problem-detail.types'
import type { MyReport } from '@/modules/operational-cards/types/my-reports.types'
import type { SituationsListScope } from '@/modules/api/situations.api'

/** Estado de carga, independiente por nivel: un fallo en LEVEL 1 no borra la baraja. */
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Estados de situación que cuentan como problema activo en el MVP.
 * Espejo de `ACTIVE_SITUATION_STATUSES` del backend; RESOLVED y CLOSED
 * quedan fuera de esta experiencia.
 */
export type ActiveSituationStatus = 'OPEN' | 'IN_PROGRESS'

/**
 * LEVEL 1. La carta activa solo MUESTRA título y severidad; el resto de
 * campos existen para ordenar (SLA, impacto, antigüedad) y no se pintan.
 */
export interface CoordinationProblem {
  id: string
  title: string
  severity: SituationSeverity
  status: ActiveSituationStatus
  createdAt: string
  slaHealth?: 'on_track' | 'at_risk' | 'overdue' | 'closed'
  affectedCoordinationCount?: number
}

/**
 * Caché de LEVEL 1 por coordinación: volver a una carta ya visitada no debe
 * costar una petición. La clave es el `code` de la coordinación.
 */
export interface CachedCoordinationProblems {
  problems: readonly CoordinationProblem[]
  /** Se guarda con la lista: volver a una carta debe recuperar su mensaje. */
  scope: SituationsListScope
}

export type CoordinationProblemsCache = Readonly<
  Partial<Record<CoordinationId, CachedCoordinationProblems>>
>

/** Rama de LEVEL 1. `coordinationCode` dice a qué selección pertenece. */
export interface OperationalCardsLevel1State {
  status: LoadState
  coordinationCode: CoordinationId | null
  problems: readonly CoordinationProblem[]
  errorMessage: string | null
  /**
   * Con qué alcance se leyó esta lista, según el SERVIDOR.
   *
   * `own-only` significa que solo contiene los reportes del propio usuario en
   * esa coordinación. De ahí que una lista vacía no pueda anunciarse como «sin
   * problemas activos»: lo único que se sabe es que no hay ninguno visible para
   * él. El estado de integridad del área NO sale de aquí, sino del resumen
   * autorizado de LEVEL 0, y no se degrada por una lista restringida.
   */
  scope: SituationsListScope
}

/**
 * MODO DEL PANEL DERECHO. Son dos flujos y un reposo, no tres formularios:
 *
 *   idle    Nada iniciado todavía: una indicación breve de qué se puede hacer.
 *   report  Formulario de reporte para la coordinación seleccionada.
 *   detail  Detalle completo del problema elegido, con sus acciones.
 *
 * El modo es EXPLÍCITO y no se deduce de la selección, porque seleccionar una
 * carta NO debe abrir el formulario: eso lo decide el usuario pulsando
 * «Reportar problema».
 */
export type OperationalPanelMode = 'idle' | 'report' | 'detail'

/** Rama de «Mis reportes». Independiente de la carta seleccionada. */
export interface MyReportsState {
  status: LoadState
  items: readonly MyReport[]
  total: number
  /** Última página cargada. La lista crece de forma incremental. */
  page: number
  /** Una página en vuelo sobre una lista que ya tiene contenido. */
  loadingMore: boolean
  errorMessage: string | null
}

/** Borrador del formulario de reporte. Vive mientras la pantalla esté montada. */
export interface ReportDraft {
  title: string
  description: string
  categoryId: string
  severity: SituationSeverity
  /** `datetime-local`, en hora local del usuario. */
  occurredAt: string
}

/**
 * Operación de escritura en curso. Solo puede haber UNA: es lo que impide un
 * envío duplicado mientras la anterior sigue viva.
 *
 * `targetKey` guarda el DESTINO capturado al enviar —el `code` de la
 * coordinación en un reporte, el `problemId` en una resolución—, de modo que la
 * respuesta actualice ese destino aunque el usuario ya esté mirando otro.
 */
export interface OperationalSubmissionState {
  kind: 'report' | 'resolution' | null
  status: 'idle' | 'sending' | 'error'
  targetKey: string | null
  errorMessage: string | null
  /**
   * El servidor YA confirmó el registro y lo que falló fue el refresco
   * posterior. Distinguirlo evita invitar a reenviar algo que ya existe.
   */
  confirmedButStale: boolean
}

export interface OperationalCardsState {
  overview: OperationalOverview | null
  level0: LoadState
  errorMessage: string | null

  /** `code` de la coordinación seleccionada. null = estado global. */
  selectedCoordinationCode: CoordinationId | null
  /** `code` bajo el cursor o el foco. Solo alimenta la reacción del personaje. */
  hoveredCoordinationCode: CoordinationId | null

  level1: OperationalCardsLevel1State
  problemsByCoordination: CoordinationProblemsCache

  /** Problema abierto en el panel derecho. null = sin detalle. */
  selectedProblemId: string | null
  level2: OperationalCardsLevel2State
  detailByProblem: ProblemDetailCache

  /** Lista propia del usuario, transversal a las coordinaciones. */
  myReports: MyReportsState

  /** Qué muestra el panel derecho. */
  panelMode: OperationalPanelMode

  /**
   * Borradores de reporte POR COORDINACIÓN (clave: `code`, o
   * `UNASSIGNED_DRAFT_KEY` sin selección). Cambiar de carta no pierde el texto
   * escrito ni lo traslada a otra área.
   */
  reportDrafts: Readonly<Record<string, ReportDraft>>

  /** Borradores de aprendizaje POR PROBLEMA. Misma razón. */
  learningDrafts: Readonly<Record<string, string>>

  submission: OperationalSubmissionState

  /**
   * GENERACIÓN DE DATOS. Sube en cada escritura confirmada.
   *
   * Toda carga en vuelo lleva la generación con la que se pidió; si al volver
   * la generación ya no coincide, la respuesta se descarta. Sin esto, una
   * lectura lanzada ANTES de crear o resolver podría llegar después y
   * reintroducir la lista previa a la operación.
   */
  dataGeneration: number

  /**
   * Reacción puntual pendiente para el personaje. El renderer la consume y
   * avisa, de modo que un remontaje o un refresco no la repitan.
   */
  pendingCharacterReaction: CharacterReactionRequest | null
}

/**
 * REACCIÓN MOMENTÁNEA del personaje ante una operación CONFIRMADA.
 *
 * Es una capa distinta de `mood`, y conviene no confundirlas:
 *
 *   mood      ESTADO PERSISTENTE. Describe cómo está la coordinación observada
 *             —o la Dirección, sin selección— y se recalcula con los datos. Vive
 *             mientras esa situación siga siendo la misma.
 *   reacción  HECHO PUNTUAL. Describe algo que ACABA de ocurrir. Se representa
 *             una vez, se agota sola y no altera el mood: el personaje vuelve
 *             por sí solo a la expresión del estado vigente, sin que nadie lo
 *             fuerce a neutral.
 *
 * SIGNIFICADO DE CADA EVENTO, verificado observando el arte y no deduciéndolo
 * del nombre del trigger:
 *
 *   report-confirmed      Acaba de aparecer un problema. El personaje expresa
 *                         MALESTAR: `disapprove` cierra los ojos, quiebra las
 *                         cejas y curva la boca hacia abajo.
 *   resolution-confirmed  Un problema acaba de quedar resuelto con su
 *                         aprendizaje. El personaje expresa ALIVIO: `approve`
 *                         abre la boca en una sonrisa amplia.
 *
 * `id` la hace idempotente: el personaje dispara una sola vez por
 * identificador, aunque el estado se vuelva a renderizar o el canvas se
 * remonte.
 */
export interface CharacterReactionRequest {
  id: number
  kind: 'report-confirmed' | 'resolution-confirmed'
  /** Propiedad de data binding del `.riv` que se dispara. */
  trigger: 'approve' | 'disapprove'
  /**
   * Coordinación a la que pertenece el HECHO, capturada en el momento de
   * confirmarlo. La reacción solo se representa si el usuario sigue observando
   * esa coordinación: una operación en otra área no debe leerse como si hubiera
   * ocurrido en la seleccionada, y tampoco se le devuelve a la fuerza a ella.
   */
  coordinationCode: CoordinationId | null
}

/** Clave de borrador cuando todavía no hay coordinación seleccionada. */
export const UNASSIGNED_DRAFT_KEY = '__sin-coordinacion__'

/**
 * Rama de LEVEL 2. `problemId` dice a qué problema pertenece, de modo que una
 * respuesta que llega tarde tras cerrar la isla se descarta en el reducer.
 */
export interface OperationalCardsLevel2State {
  status: LoadState
  problemId: string | null
  detail: ProblemDetail | null
  errorMessage: string | null
  /** Secciones que necesitan su propia petición, con su propio estado. */
  sections: ProblemSectionsState
  /** Secciones desplegadas. El contenido se pide al abrirse por primera vez. */
  expanded: readonly ProblemSectionId[]
}

/** Caché de detalle y de secciones por problema, viva mientras el componente. */
export type ProblemDetailCache = Readonly<
  Partial<
    Record<
      string,
      { detail: ProblemDetail; sections: ProblemSectionsState }
    >
  >
>
