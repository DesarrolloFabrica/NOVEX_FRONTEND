/**
 * TEMPORAL — Datos mock para la pestaña Red de impacto sin backend conectado.
 *
 * Para conectar el backend:
 * 1. Eliminar este archivo.
 * 2. Quitar el fallback en `ImpactNetworkExperience.tsx` (buscar IMPACT_NETWORK_MOCK_FALLBACK).
 */

import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

/** Activa el fallback mock cuando la API no devuelve situaciones. */
export const IMPACT_NETWORK_MOCK_FALLBACK_ENABLED = true

const MOCK_EVENT_IDS = ['evt-001', 'evt-002'] as const

/** Dos situaciones activas con replay y propagación en el mapa. */
export const IMPACT_NETWORK_MOCK_EVENTS: readonly OperationalEvent[] =
  OPERATIONAL_EVENTS.filter((event) =>
    (MOCK_EVENT_IDS as readonly string[]).includes(event.id),
  )
