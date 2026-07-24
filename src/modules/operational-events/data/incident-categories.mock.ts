// Capa: datos (mock) — taxonomía de categorías de incidente.
// Responsabilidad: vocabulario cerrado que las interpretaciones mock respetan.

import type { IncidentCategory } from '@/modules/operational-events/types/operational-event.types'

/** Catálogo oficial de categorías operacionales (fase mock). */
export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  {
    id: 'cat-outage',
    code: 'OUTAGE',
    name: 'Caída de servicio',
    description: 'Interrupción total o parcial de un sistema crítico.',
  },
  {
    id: 'cat-delay',
    code: 'DELAY',
    name: 'Retraso operacional',
    description: 'Desfase en tiempos comprometidos de un proceso.',
  },
  {
    id: 'cat-data-quality',
    code: 'DATA_QUALITY',
    name: 'Calidad de datos',
    description: 'Inconsistencias, vacíos o errores en información operativa.',
  },
  {
    id: 'cat-tech-failure',
    code: 'TECH_FAILURE',
    name: 'Falla tecnológica',
    description: 'Defectos, bugs o degradación de plataformas.',
  },
  {
    id: 'cat-academic-error',
    code: 'ACADEMIC_ERROR',
    name: 'Error de programación académica',
    description: 'Errores en asignación, horarios, cupos o mallas.',
  },
  {
    id: 'cat-dependency',
    code: 'DEPENDENCY',
    name: 'Dependencia bloqueante',
    description: 'Bloqueo por dependencia interna o externa.',
  },
  {
    id: 'cat-reprocess',
    code: 'REPROCESS',
    name: 'Reproceso',
    description: 'Trabajo que debe rehacerse por falla de calidad o control.',
  },
  {
    id: 'cat-intermittence',
    code: 'INTERMITTENCE',
    name: 'Intermitencia',
    description: 'Disponibilidad inestable de un servicio o canal.',
  },
  {
    id: 'cat-risk',
    code: 'RISK',
    name: 'Riesgo operacional',
    description: 'Amenaza identificada que aún no materializa impacto pleno.',
  },
]
