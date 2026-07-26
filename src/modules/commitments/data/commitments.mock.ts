// Capa: datos (mock) del módulo "commitments".
// Responsabilidad: proveer compromisos de ejemplo por área operativa.
// Más adelante este origen se reemplazará por la API/servicio real.
//
// Reglas aplicadas a estos mocks:
// - Mínimo 3 compromisos por cada área OPERATIVA.
// - El área global ("Visión General Operaciones") NO tiene compromisos propios.
// - La semilla mezcla estados para que Seguimiento pueda evaluarse con una
//   fotografía realista desde la primera carga; los impactos siguen variados.

import { AREAS } from '@/modules/areas/data/areas.mock'
import { resolveAreaName } from '@/modules/areas/utils/areas.utils'
import type {
  Commitment,
  CommitmentStatus,
  OperationalImpact,
} from '@/modules/commitments/types/commitment.types'

/** Semilla mínima para construir un compromiso sin repetir campos derivados. */
interface CommitmentSeed {
  areaId: string
  title: string
  description: string
  responsibleName: string
  dueDate: string
  status: CommitmentStatus
  operationalImpact: OperationalImpact
  progress?: number
}

let sequence = 0

/** Construye un Commitment completo a partir de una semilla. */
function buildCommitment(seed: CommitmentSeed): Commitment {
  sequence += 1
  return {
    id: `cmt-${String(sequence).padStart(3, '0')}`,
    title: seed.title,
    description: seed.description,
    areaId: seed.areaId,
    areaName: resolveAreaName(AREAS, seed.areaId),
    responsibleName: seed.responsibleName,
    dueDate: seed.dueDate,
    status: seed.status,
    operationalImpact: seed.operationalImpact,
    progress: seed.progress,
    createdAt: '2026-06-01T08:00:00.000Z',
    lastUpdateAt: '2026-06-20T08:00:00.000Z',
    history: [],
  }
}

const SEEDS: CommitmentSeed[] = [
  // --- Coordinador de Operación Académica ---
  {
    areaId: 'area-operacion-academica',
    title: 'Publicar malla curricular del semestre',
    description: 'Consolidar y publicar la malla curricular validada por decanatura.',
    responsibleName: 'Laura Gómez',
    dueDate: '2026-07-10',
    status: 'Cumplido',
    operationalImpact: 3,
    progress: 100,
  },
  {
    areaId: 'area-operacion-academica',
    title: 'Asignar docentes a cursos críticos',
    description: 'Cerrar la asignación docente de los cursos con alta demanda.',
    responsibleName: 'Laura Gómez',
    dueDate: '2026-07-15',
    status: 'Pendiente de validación',
    operationalImpact: 4,
    progress: 60,
  },
  {
    areaId: 'area-operacion-academica',
    title: 'Cerrar actas de evaluación pendientes',
    description: 'Regularizar actas de evaluación del periodo anterior.',
    responsibleName: 'Carlos Méndez',
    dueDate: '2026-06-30',
    status: 'Incumplido',
    operationalImpact: 2,
    progress: 40,
  },

  // --- Coordinador de Fábrica y Desarrollo ---
  {
    areaId: 'area-fabrica-desarrollo',
    title: 'Liberar versión del LMS',
    description: 'Desplegar la nueva versión del LMS en producción.',
    responsibleName: 'Andrés Rivas',
    dueDate: '2026-07-05',
    status: 'Incumplido',
    operationalImpact: 5,
    progress: 70,
  },
  {
    areaId: 'area-fabrica-desarrollo',
    title: 'Documentar API de integración',
    description: 'Publicar la documentación de la API para aliados.',
    responsibleName: 'Andrés Rivas',
    dueDate: '2026-07-20',
    status: 'Cumplido',
    operationalImpact: 2,
    progress: 100,
  },
  {
    areaId: 'area-fabrica-desarrollo',
    title: 'Corregir incidentes de severidad alta',
    description: 'Resolver los incidentes priorizados del backlog técnico.',
    responsibleName: 'Diana Quintero',
    dueDate: '2026-07-12',
    status: 'Pendiente de validación',
    operationalImpact: 4,
    progress: 50,
  },

  // --- Líder de Innovación y Transformación EDU ---
  {
    areaId: 'area-innovacion-edu',
    title: 'Pilotar herramienta de IA en aula',
    description: 'Ejecutar el piloto de la herramienta de IA con dos cursos.',
    responsibleName: 'Sofía Ramírez',
    dueDate: '2026-07-18',
    status: 'Cumplido',
    operationalImpact: 3,
    progress: 100,
  },
  {
    areaId: 'area-innovacion-edu',
    title: 'Capacitar docentes en metodologías activas',
    description: 'Realizar la primera jornada de capacitación docente.',
    responsibleName: 'Sofía Ramírez',
    dueDate: '2026-07-25',
    status: 'Pendiente de validación',
    operationalImpact: 2,
    progress: 30,
  },
  {
    areaId: 'area-innovacion-edu',
    title: 'Definir indicadores de innovación',
    description: 'Establecer el tablero de indicadores de transformación EDU.',
    responsibleName: 'Julián Torres',
    dueDate: '2026-07-08',
    status: 'Pendiente de validación',
    operationalImpact: 3,
    progress: 20,
  },

  // --- Supervisor B2B ---
  {
    areaId: 'area-b2b',
    title: 'Cerrar contrato con cliente corporativo',
    description: 'Formalizar el contrato del nuevo cliente corporativo.',
    responsibleName: 'Mónica Salas',
    dueDate: '2026-07-09',
    status: 'Cumplido',
    operationalImpact: 5,
    progress: 100,
  },
  {
    areaId: 'area-b2b',
    title: 'Actualizar propuesta comercial',
    description: 'Renovar el portafolio y la propuesta comercial B2B.',
    responsibleName: 'Mónica Salas',
    dueDate: '2026-07-22',
    status: 'Pendiente de validación',
    operationalImpact: 3,
    progress: 45,
  },
  {
    areaId: 'area-b2b',
    title: 'Recuperar cuentas en riesgo de fuga',
    description: 'Ejecutar el plan de retención de cuentas críticas.',
    responsibleName: 'Pablo Herrera',
    dueDate: '2026-07-03',
    status: 'Incumplido',
    operationalImpact: 4,
    progress: 25,
  },

  // --- Líder de Servicio ---
  {
    areaId: 'area-servicio',
    title: 'Reducir tiempo de respuesta de soporte',
    description: 'Cumplir el SLA de respuesta a tickets de soporte.',
    responsibleName: 'Natalia Ruiz',
    dueDate: '2026-07-14',
    status: 'Cumplido',
    operationalImpact: 3,
    progress: 100,
  },
  {
    areaId: 'area-servicio',
    title: 'Implementar encuesta de satisfacción',
    description: 'Desplegar la encuesta NPS en todos los canales.',
    responsibleName: 'Natalia Ruiz',
    dueDate: '2026-07-19',
    status: 'Pendiente de validación',
    operationalImpact: 1,
    progress: 10,
  },
  {
    areaId: 'area-servicio',
    title: 'Atender casos escalados de clientes VIP',
    description: 'Resolver los casos escalados del segmento VIP.',
    responsibleName: 'Camilo Bravo',
    dueDate: '2026-07-01',
    status: 'Pendiente de validación',
    operationalImpact: 4,
    progress: 100,
  },

  // --- Coordinadora Pruebas Saber ---
  {
    areaId: 'area-pruebas-saber',
    title: 'Programar simulacro institucional',
    description: 'Agendar y comunicar el simulacro de Pruebas Saber.',
    responsibleName: 'Patricia León',
    dueDate: '2026-07-11',
    status: 'Pendiente de validación',
    operationalImpact: 3,
    progress: 55,
  },
  {
    areaId: 'area-pruebas-saber',
    title: 'Analizar resultados del simulacro anterior',
    description: 'Entregar el informe de resultados con plan de mejora.',
    responsibleName: 'Patricia León',
    dueDate: '2026-06-28',
    status: 'Incumplido',
    operationalImpact: 5,
    progress: 35,
  },
  {
    areaId: 'area-pruebas-saber',
    title: 'Actualizar banco de preguntas',
    description: 'Revisar y ampliar el banco de preguntas por competencia.',
    responsibleName: 'Hernán Díaz',
    dueDate: '2026-07-21',
    status: 'Pendiente de validación',
    operationalImpact: 2,
    progress: 100,
  },

  // --- Coordinador de Proyección Social ---
  {
    areaId: 'area-proyeccion-social',
    title: 'Ejecutar jornada comunitaria',
    description: 'Realizar la jornada de proyección social del trimestre.',
    responsibleName: 'Valeria Ospina',
    dueDate: '2026-07-16',
    status: 'Cumplido',
    operationalImpact: 2,
    progress: 100,
  },
  {
    areaId: 'area-proyeccion-social',
    title: 'Firmar convenio con aliado social',
    description: 'Formalizar el convenio con la fundación aliada.',
    responsibleName: 'Valeria Ospina',
    dueDate: '2026-07-06',
    status: 'Pendiente de validación',
    operationalImpact: 3,
    progress: 40,
  },
  {
    areaId: 'area-proyeccion-social',
    title: 'Reportar impacto social del semestre',
    description: 'Consolidar el informe de impacto social institucional.',
    responsibleName: 'Esteban Cano',
    dueDate: '2026-06-29',
    status: 'Pendiente de validación',
    operationalImpact: 1,
    progress: 100,
  },

  // --- Coordinador de Desarrollo Profesional ---
  {
    areaId: 'area-desarrollo-profesional',
    title: 'Lanzar programa de mentorías',
    description: 'Activar el programa interno de mentorías profesionales.',
    responsibleName: 'Daniela Vargas',
    dueDate: '2026-07-13',
    status: 'Pendiente de validación',
    operationalImpact: 2,
    progress: 35,
  },
  {
    areaId: 'area-desarrollo-profesional',
    title: 'Certificar competencias técnicas del equipo',
    description: 'Gestionar las certificaciones técnicas comprometidas.',
    responsibleName: 'Daniela Vargas',
    dueDate: '2026-07-02',
    status: 'Pendiente de validación',
    operationalImpact: 4,
    progress: 30,
  },
  {
    areaId: 'area-desarrollo-profesional',
    title: 'Publicar plan de carrera',
    description: 'Difundir el plan de carrera y rutas de crecimiento.',
    responsibleName: 'Óscar Pineda',
    dueDate: '2026-07-24',
    status: 'Pendiente de validación',
    operationalImpact: 3,
    progress: 100,
  },
]

/** Compromisos de ejemplo listos para alimentar selectores y motor de salud. */
export const COMMITMENTS: Commitment[] = SEEDS.map(buildCommitment)
