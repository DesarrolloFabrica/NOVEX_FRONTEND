// Capa: dominio (tipos) del módulo "areas".
// Responsabilidad: describir la forma de un Área institucional.
// No contiene lógica; solo el contrato de datos que el resto de capas consume.

/**
 * Área institucional monitoreada durante el precomité.
 * Un área puede ser operativa (genera y reporta compromisos) o global
 * (consolida la salud de todas las demás, p. ej. "Visión General Operaciones").
 */
export interface Area {
  /** Identificador estable e interno (no visible al usuario final). */
  id: string
  /** Código corto/operativo del área (siglas). */
  code: string
  /** Nombre oficial del área tal como se muestra en la interfaz. */
  name: string
  /** Descripción opcional del alcance del área. */
  description?: string
  /**
   * Marca un área "global". Las áreas globales no tienen compromisos propios:
   * su salud se calcula agregando los compromisos de todas las áreas operativas.
   */
  isGlobal?: boolean
}
