/**
 * Datos mock de la Vista General Operacional (Fase 1).
 * Sustituibles por backend en fases posteriores — no hardcodear en JSX.
 */

import {
  getCoordination,
  type CoordinationId,
} from '@/modules/impact-network/data/coordination-islands.config'

import type { IncidentCategoryIcon } from '@/modules/situations/data/incident-category-visual'

export type OperationalStatus = 'normal' | 'attention' | 'high' | 'critical'

export type ProblemCategoryId = IncidentCategoryIcon

export interface OperationalOverviewMetrics {
  coordinations: number
  affected: number
  activeProblems: number
  openSituations: number
  operationalRisk: number
  operationalRiskMax: number
  updatedLabel: string
}

export interface CoordinationProblemTag {
  categoryId: ProblemCategoryId
  label: string
  activeCount: number
}

export interface CoordinationOperationalState {
  coordinationId: CoordinationId
  status: OperationalStatus
  statusLabel: string
  problems: readonly CoordinationProblemTag[]
}

export interface ProblemCategoryItem {
  id: ProblemCategoryId
  name: string
  shortDescription: string
  count: number
}

export interface AttentionItem {
  coordinationId: CoordinationId
  name: string
  status: OperationalStatus
  statusLabel: string
  summary: string
  detail?: string
}

export interface DetectedPattern {
  id: string
  title: string
  primary: string
  secondary: string
  tone: OperationalStatus
}

export interface RecentActivityItem {
  id: string
  timeLabel: string
  text: string
  tone: OperationalStatus | 'resolved'
}

export interface CoordinationContextProblem {
  categoryId: ProblemCategoryId
  label: string
  detail: string
}

export interface CoordinationContextPanelData {
  coordinationId: CoordinationId
  name: string
  status: OperationalStatus
  statusLabel: string
  whatIsHappening: readonly CoordinationContextProblem[]
  mainSituation: {
    title: string
    description: string
    alsoAffects?: string
  }
  recentActivity: readonly RecentActivityItem[]
}

export const OPERATIONAL_STATUS_LABEL: Record<OperationalStatus, string> = {
  normal: 'Normal',
  attention: 'Atención',
  high: 'Alta',
  critical: 'Crítica',
}

export const operationalOverview: OperationalOverviewMetrics = {
  coordinations: 14,
  affected: 3,
  activeProblems: 12,
  openSituations: 2,
  operationalRisk: 68,
  operationalRiskMax: 100,
  updatedLabel: 'Actualizado hace 2 min',
}

/** Estados visuales de prueba desacoplados del backend. */
const STATUS_BY_ID: Readonly<Record<string, OperationalStatus>> = {
  'coord-fabrica-contenidos': 'critical',
  'coord-operaciones-academicas': 'critical',
  'coord-homologaciones': 'high',
  'coord-ingenierias': 'high',
  'coord-especializaciones': 'high',
  'coord-servicios': 'attention',
  'coord-b2b': 'attention',
  'coord-negocios': 'attention',
  'coord-bellas-artes': 'attention',
}

const PROBLEMS_BY_ID: Readonly<
  Record<string, readonly CoordinationProblemTag[]>
> = {
  'coord-fabrica-contenidos': [
    { categoryId: 'internet', label: 'Internet', activeCount: 2 },
    { categoryId: 'apps', label: 'Aplicativos', activeCount: 1 },
    { categoryId: 'tickets', label: 'Tickets', activeCount: 1 },
  ],
  'coord-homologaciones': [
    { categoryId: 'apps', label: 'Aplicativos', activeCount: 1 },
    { categoryId: 'zoho', label: 'Zoho', activeCount: 1 },
    { categoryId: 'diplomas', label: 'Diplomados', activeCount: 1 },
  ],
  'coord-servicios': [
    { categoryId: 'devices', label: 'Equipos', activeCount: 1 },
  ],
}

export function resolveCoordinationOperationalState(
  coordinationId: CoordinationId,
): CoordinationOperationalState {
  const canonicalId = getCoordination(coordinationId).id
  const status = STATUS_BY_ID[canonicalId] ?? 'normal'
  return {
    coordinationId: canonicalId,
    status,
    statusLabel: OPERATIONAL_STATUS_LABEL[status],
    problems: PROBLEMS_BY_ID[canonicalId] ?? [],
  }
}

export const problemCategories: readonly ProblemCategoryItem[] = [
  {
    id: 'internet',
    name: 'Internet',
    shortDescription: 'Red, wifi y conectividad',
    count: 6,
  },
  {
    id: 'apps',
    name: 'Aplicativos',
    shortDescription: 'Sistemas y aplicativos',
    count: 4,
  },
  {
    id: 'tickets',
    name: 'Tickets',
    shortDescription: 'Mesa de ayuda y tickets',
    count: 3,
  },
  {
    id: 'zoho',
    name: 'Zoho',
    shortDescription: 'Plataforma Zoho',
    count: 2,
  },
  {
    id: 'infrastructure',
    name: 'Infraestructura',
    shortDescription: 'Sedes, planta y recursos físicos',
    count: 1,
  },
]

export const attentionItems: readonly AttentionItem[] = [
  {
    coordinationId: 'coord-fabrica-contenidos',
    name: 'Fábrica de contenidos',
    status: 'critical',
    statusLabel: 'Crítica',
    summary: 'Interrupción del tablero operativo',
    detail: 'Afecta a 2 coordinaciones',
  },
  {
    coordinationId: 'coord-homologaciones',
    name: 'Homologaciones',
    status: 'high',
    statusLabel: 'Alta',
    summary: 'Problemas recurrentes esta semana',
    detail: '3 registros esta semana',
  },
  {
    coordinationId: 'coord-servicios',
    name: 'Servicios',
    status: 'attention',
    statusLabel: 'Atención',
    summary: 'Vacante pendiente',
    detail: '18 días abierta',
  },
]

export const detectedPatterns: readonly DetectedPattern[] = [
  {
    id: 'pattern-connectivity-fabrica',
    title: 'Conectividad · Fábrica',
    primary: '7 registros este mes',
    secondary: '↑ 40% frente al mes anterior',
    tone: 'critical',
  },
  {
    id: 'pattern-staff-servicios',
    title: 'Personal · Servicios',
    primary: '4 registros abiertos',
    secondary: 'Más antiguo: 18 días',
    tone: 'attention',
  },
  {
    id: 'pattern-platforms',
    title: 'Plataformas',
    primary: '5 interrupciones en 14 días',
    secondary: '3 coordinaciones involucradas',
    tone: 'high',
  },
]

export const coordinationContextPanels: Readonly<
  Record<string, CoordinationContextPanelData>
> = {
  'coord-fabrica-contenidos': {
    coordinationId: 'coord-fabrica-contenidos',
    name: 'Fábrica de contenidos',
    status: 'critical',
    statusLabel: 'Atención crítica',
    whatIsHappening: [
      {
        categoryId: 'internet',
        label: 'Internet',
        detail: '2 problemas activos',
      },
      {
        categoryId: 'apps',
        label: 'Aplicativos',
        detail: '1 situación crítica',
      },
      {
        categoryId: 'tickets',
        label: 'Tickets',
        detail: '1 problema activo',
      },
    ],
    mainSituation: {
      title: 'Interrupción del tablero operativo',
      description:
        'El tablero utilizado por Fábrica presenta una interrupción que está dificultando el seguimiento de actividades.',
      alsoAffects: 'También está afectando a Homologaciones.',
    },
    recentActivity: [
      {
        id: 'fabrica-act-1',
        timeLabel: '09:42',
        text: 'Nueva incidencia de conectividad',
        tone: 'critical',
      },
      {
        id: 'fabrica-act-2',
        timeLabel: '08:31',
        text: 'Situación actualizada',
        tone: 'attention',
      },
      {
        id: 'fabrica-act-3',
        timeLabel: 'Ayer',
        text: 'Fallo de plataforma resuelto',
        tone: 'resolved',
      },
    ],
  },
  'coord-homologaciones': {
    coordinationId: 'coord-homologaciones',
    name: 'Homologaciones',
    status: 'high',
    statusLabel: 'Atención alta',
    whatIsHappening: [
      {
        categoryId: 'apps',
        label: 'Aplicativos',
        detail: '1 problema activo',
      },
      {
        categoryId: 'zoho',
        label: 'Zoho',
        detail: 'Incidencias recurrentes',
      },
      {
        categoryId: 'diplomas',
        label: 'Diplomados',
        detail: '1 registro pendiente',
      },
    ],
    mainSituation: {
      title: 'Problemas recurrentes esta semana',
      description:
        'Homologaciones acumula varios registros relacionados con plataforma y procesos en los últimos días.',
    },
    recentActivity: [
      {
        id: 'homo-act-1',
        timeLabel: 'Hoy',
        text: 'Nuevo registro de plataforma',
        tone: 'high',
      },
      {
        id: 'homo-act-2',
        timeLabel: 'Ayer',
        text: 'Proceso revisado',
        tone: 'attention',
      },
    ],
  },
  'coord-servicios': {
    coordinationId: 'coord-servicios',
    name: 'Servicios',
    status: 'attention',
    statusLabel: 'Requiere atención',
    whatIsHappening: [
      {
        categoryId: 'devices',
        label: 'Equipos',
        detail: '1 equipo sin cobertura',
      },
    ],
    mainSituation: {
      title: 'Vacante pendiente',
      description:
        'Hay una vacante abierta que está afectando la capacidad de respuesta del equipo de Servicios.',
    },
    recentActivity: [
      {
        id: 'serv-act-1',
        timeLabel: '18 días',
        text: 'Vacante abierta sin resolver',
        tone: 'attention',
      },
    ],
  },
}

export function getCoordinationContextPanel(
  coordinationId: CoordinationId,
): CoordinationContextPanelData | null {
  const canonicalId = getCoordination(coordinationId).id
  return coordinationContextPanels[canonicalId] ?? null
}

export function isAffectedOperationalStatus(
  status: OperationalStatus,
): boolean {
  return status !== 'normal'
}
