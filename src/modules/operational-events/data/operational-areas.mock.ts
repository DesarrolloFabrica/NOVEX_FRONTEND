// Capa: datos (mock) — catálogo de áreas del dominio operational-events.
// Responsabilidad: proveer OperationalArea independientes del módulo "areas"
// legado, reutilizando los mismos ids institucionales para convivencia.

import type { OperationalArea } from '@/modules/operational-events/types/operational-event.types'

/**
 * Catálogo de áreas del Centro de Inteligencia Operacional.
 *
 * - VGO es el agregador global (isGlobal: true).
 * - El resto son áreas operativas que reportan y/o resultan afectadas.
 */
export const OPERATIONAL_AREAS_CATALOG: OperationalArea[] = [
  {
    id: 'area-vision-general',
    code: 'VGO',
    name: 'Visión General Operaciones',
    description:
      'Vista consolidada del estado operacional de todas las áreas.',
    isGlobal: true,
  },
  {
    id: 'area-operacion-academica',
    code: 'COA',
    name: 'Coordinador de Operación Académica',
    description: 'Programación académica, mallas y operación de cursos.',
  },
  {
    id: 'area-fabrica-desarrollo',
    code: 'CFD',
    name: 'Coordinador de Fábrica y Desarrollo',
    description: 'Plataformas, despliegues e integraciones tecnológicas.',
  },
  {
    id: 'area-innovacion-edu',
    code: 'LIT',
    name: 'Líder de Innovación y Transformación EDU',
    description: 'Iniciativas de transformación e innovación educativa.',
  },
  {
    id: 'area-b2b',
    code: 'SB2B',
    name: 'Supervisor B2B',
    description: 'Operación comercial y contractual con clientes B2B.',
  },
  {
    id: 'area-servicio',
    code: 'LSV',
    name: 'Líder de Servicio',
    description: 'Soporte, SLA y experiencia de servicio.',
  },
  {
    id: 'area-pruebas-saber',
    code: 'CPS',
    name: 'Coordinadora Pruebas Saber',
    description: 'Simulacros, bancos de ítems y operación de pruebas.',
  },
  {
    id: 'area-proyeccion-social',
    code: 'CPSO',
    name: 'Coordinador de Proyección Social',
    description: 'Convenios y jornadas de proyección social.',
  },
  {
    id: 'area-desarrollo-profesional',
    code: 'CDP',
    name: 'Coordinador de Desarrollo Profesional',
    description: 'Talento, certificaciones y rutas de carrera.',
  },
]

/** Áreas operativas (excluye el agregador global). */
export const OPERATIONAL_AREAS: OperationalArea[] =
  OPERATIONAL_AREAS_CATALOG.filter((area) => !area.isGlobal)

/** Área global del catálogo. */
export const GLOBAL_OPERATIONAL_AREA: OperationalArea | undefined =
  OPERATIONAL_AREAS_CATALOG.find((area) => area.isGlobal)
