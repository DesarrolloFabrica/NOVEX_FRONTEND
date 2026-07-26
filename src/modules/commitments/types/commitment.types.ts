// Capa: dominio (tipos) del módulo "commitments".
// Responsabilidad: describir un Compromiso institucional y sus valores cerrados.
// Sin lógica: es el contrato que consumen servicios, reducers, motor y selectores.

/** Estado de validación de un compromiso durante el precomité. */
export type CommitmentStatus =
  | 'Pendiente de validación'
  | 'Cumplido'
  | 'Incumplido'

/**
 * Impacto operativo del compromiso en una escala 1..5.
 * Se usa como ponderación al calcular el riesgo operativo de un área.
 */
export type OperationalImpact = 1 | 2 | 3 | 4 | 5

/** Actor que ejecuta una acción de trazabilidad sobre un compromiso. */
export interface CommitmentActor {
  id: string
  name: string
}

/**
 * Entrada de trazabilidad del compromiso. Por ahora solo registra cambios de
 * estado (validaciones); el tipo `type` queda abierto para futuras acciones.
 */
export interface CommitmentHistoryEntry {
  /** Identificador de la entrada (único dentro del compromiso). */
  id: string
  /** Compromiso al que pertenece la entrada. */
  commitmentId: string
  /** Tipo de evento registrado. */
  type: 'status_change'
  /** Estado previo al cambio. */
  fromStatus: CommitmentStatus
  /** Estado resultante del cambio. */
  toStatus: CommitmentStatus
  /** Id del usuario que ejecutó la acción. */
  byUserId: string
  /** Nombre del usuario que ejecutó la acción. */
  byUserName: string
  /** Marca de tiempo del evento (ISO 8601). */
  at: string
  /** Descripción legible del evento. */
  description: string
}

/** Compromiso adquirido por un área y validado en el precomité. */
export interface Commitment {
  /** Identificador estable e interno del compromiso. */
  id: string
  /** Título corto del compromiso. */
  title: string
  /** Descripción detallada de lo comprometido. */
  description: string
  /** Área responsable (referencia por id). */
  areaId: string
  /** Nombre del área denormalizado para mostrar sin resolver el id. */
  areaName: string
  /** Persona responsable de ejecutar el compromiso. */
  responsibleName: string
  /** Fecha límite (ISO 8601). */
  dueDate: string
  /** Estado de validación actual. */
  status: CommitmentStatus
  /**
   * Calificación en borrador (precomité). No afecta la salud del área hasta
   * pulsar «Aplicar validación» en la consola central.
   */
  draftStatus?: CommitmentStatus
  /** Impacto operativo (1..5) usado para ponderar el riesgo. */
  operationalImpact: OperationalImpact
  /** Avance porcentual opcional (0..100). */
  progress?: number
  /** Fecha de creación (ISO 8601). */
  createdAt: string
  /** Fecha de última actualización (ISO 8601), si existe. */
  lastUpdateAt?: string
  /** Trazabilidad de cambios del compromiso (validaciones). */
  history: CommitmentHistoryEntry[]
}
